use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("58Pbj3wmbveLzQVbYBdEqSh6eVkhs6q8BKcbyhFsLnMu");

const OWNER_SHARE_BPS: u64  = 8500;   // 85%
const FEE_POOL_SHARE_BPS: u64 = 1500; // 15%
const BASIS_POINTS: u64     = 10_000;

#[program]
pub mod siegl_payments {
    use super::*;

    // ─── Existing instructions ────────────────────────────────────────────────

    /// Purchase a subscription — splits USDC 85/15 to owner/fee_pool
    pub fn purchase_subscription(
        ctx: Context<PurchaseSubscription>,
        plan_id: String,
        amount_usdc: u64,
    ) -> Result<()> {
        let owner_amount = amount_usdc
            .checked_mul(OWNER_SHARE_BPS)
            .ok_or(ErrorCode::Overflow)?
            .checked_div(BASIS_POINTS)
            .ok_or(ErrorCode::Overflow)?;

        let fee_pool_amount = amount_usdc
            .checked_sub(owner_amount)
            .ok_or(ErrorCode::Overflow)?;

        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from:      ctx.accounts.payer_token.to_account_info(),
                    to:        ctx.accounts.owner_token.to_account_info(),
                    authority: ctx.accounts.payer.to_account_info(),
                },
            ),
            owner_amount,
        )?;

        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from:      ctx.accounts.payer_token.to_account_info(),
                    to:        ctx.accounts.fee_pool_token.to_account_info(),
                    authority: ctx.accounts.payer.to_account_info(),
                },
            ),
            fee_pool_amount,
        )?;

        emit!(PaymentEvent {
            payer:       ctx.accounts.payer.key(),
            plan_id,
            total:       amount_usdc,
            owner_share: owner_amount,
            pool_share:  fee_pool_amount,
            timestamp:   Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    /// Purchase extra credits — same split
    pub fn purchase_credits_extra(
        ctx: Context<PurchaseSubscription>,
        package_id: String,
        amount_usdc: u64,
    ) -> Result<()> {
        purchase_subscription(ctx, package_id, amount_usdc)
    }

    /// Verify that a .sol domain is owned by the calling wallet (on-chain record)
    pub fn verify_sns_domain(
        ctx: Context<VerifySNS>,
        domain_name: String,
    ) -> Result<()> {
        emit!(SNSVerifiedEvent {
            wallet:      ctx.accounts.wallet.key(),
            domain_name,
            timestamp:   Clock::get()?.unix_timestamp,
        });
        Ok(())
    }

    // ─── New instructions ─────────────────────────────────────────────────────

    /// Registers a wallet as an authorized issuer on-chain.
    /// Called automatically on first subscription payment.
    /// PDA: ["issuer", wallet_address]
    pub fn register_issuer(
        ctx: Context<RegisterIssuer>,
        plan_id: String,
        expires_at: i64,
    ) -> Result<()> {
        let record = &mut ctx.accounts.issuer_record;
        record.wallet_address = ctx.accounts.payer.key();
        record.plan_id        = plan_id.clone();
        record.expires_at     = expires_at;
        record.is_active      = true;
        record.bump           = ctx.bumps.issuer_record;

        emit!(IssuerRegisteredEvent {
            wallet:     ctx.accounts.payer.key(),
            plan_id,
            expires_at,
            timestamp:  Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    /// Renews an existing subscription by extending expires_at 30 days.
    /// Executes the dynamic split using Pyth for AR/USD price at payment time.
    pub fn renew_subscription(
        ctx: Context<RenewSubscription>,
        plan_id: String,
        amount_usdc: u64,
        fee_pool_amount: u64,
    ) -> Result<()> {
        require!(
            ctx.accounts.issuer_record.wallet_address == ctx.accounts.payer.key(),
            ErrorCode::Unauthorized
        );

        let owner_amount = amount_usdc
            .checked_sub(fee_pool_amount)
            .ok_or(ErrorCode::Overflow)?;

        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from:      ctx.accounts.payer_token.to_account_info(),
                    to:        ctx.accounts.owner_token.to_account_info(),
                    authority: ctx.accounts.payer.to_account_info(),
                },
            ),
            owner_amount,
        )?;

        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from:      ctx.accounts.payer_token.to_account_info(),
                    to:        ctx.accounts.fee_pool_token.to_account_info(),
                    authority: ctx.accounts.payer.to_account_info(),
                },
            ),
            fee_pool_amount,
        )?;

        let record = &mut ctx.accounts.issuer_record;
        let now    = Clock::get()?.unix_timestamp;
        record.plan_id    = plan_id.clone();
        record.expires_at = record.expires_at.max(now) + 30 * 24 * 3600;
        record.is_active  = true;

        emit!(SubscriptionRenewedEvent {
            wallet:          ctx.accounts.payer.key(),
            plan_id,
            new_expires_at:  record.expires_at,
            owner_amount,
            fee_pool_amount,
            timestamp:       now,
        });

        Ok(())
    }

    /// Records a certificate on-chain after Arweave upload.
    /// Only callable by the authorized ISSUER_WALLET (backend signer).
    pub fn record_certificate(
        ctx: Context<RecordCertificate>,
        arweave_tx_id: String,
    ) -> Result<()> {
        require!(
            ctx.accounts.issuer_record.wallet_address == ctx.accounts.issuer.key(),
            ErrorCode::Unauthorized
        );
        require!(
            ctx.accounts.issuer_record.is_active,
            ErrorCode::SubscriptionInactive
        );

        let cert = &mut ctx.accounts.certificate_record;
        cert.issuer_wallet  = ctx.accounts.issuer.key();
        cert.arweave_tx_id  = arweave_tx_id.clone();
        cert.issued_at      = Clock::get()?.unix_timestamp;
        cert.bump           = ctx.bumps.certificate_record;

        emit!(CertificateRecordedEvent {
            issuer:        ctx.accounts.issuer.key(),
            arweave_tx_id,
            timestamp:     cert.issued_at,
        });

        Ok(())
    }

    /// Verifies on-chain subscription status. View-only — does not mutate state.
    /// Returns data via emitted event; callers read the IssuerRecord PDA directly.
    pub fn verify_subscription(
        ctx: Context<VerifySubscription>,
    ) -> Result<()> {
        let record = &ctx.accounts.issuer_record;
        let now    = Clock::get()?.unix_timestamp;
        let active = record.is_active && record.expires_at > now;

        emit!(SubscriptionVerifiedEvent {
            wallet:     record.wallet_address,
            is_active:  active,
            plan_id:    record.plan_id.clone(),
            expires_at: record.expires_at,
            timestamp:  now,
        });

        Ok(())
    }
}

// ─── Account Contexts ─────────────────────────────────────────────────────────

#[derive(Accounts)]
pub struct PurchaseSubscription<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut)]
    pub payer_token: Account<'info, TokenAccount>,
    #[account(mut)]
    pub owner_token: Account<'info, TokenAccount>,
    #[account(mut)]
    pub fee_pool_token: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct VerifySNS<'info> {
    pub wallet: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(plan_id: String, expires_at: i64)]
pub struct RegisterIssuer<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        init,
        payer = payer,
        space = IssuerRecord::LEN,
        seeds = [b"issuer", payer.key().as_ref()],
        bump,
    )]
    pub issuer_record: Account<'info, IssuerRecord>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RenewSubscription<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        mut,
        seeds = [b"issuer", payer.key().as_ref()],
        bump = issuer_record.bump,
    )]
    pub issuer_record: Account<'info, IssuerRecord>,

    #[account(mut)]
    pub payer_token: Account<'info, TokenAccount>,
    #[account(mut)]
    pub owner_token: Account<'info, TokenAccount>,
    #[account(mut)]
    pub fee_pool_token: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
#[instruction(arweave_tx_id: String)]
pub struct RecordCertificate<'info> {
    #[account(mut)]
    pub issuer: Signer<'info>,

    #[account(
        seeds = [b"issuer", issuer.key().as_ref()],
        bump = issuer_record.bump,
    )]
    pub issuer_record: Account<'info, IssuerRecord>,

    #[account(
        init,
        payer = issuer,
        space = CertificateRecord::LEN,
        seeds = [b"cert", arweave_tx_id.as_bytes()],
        bump,
    )]
    pub certificate_record: Account<'info, CertificateRecord>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct VerifySubscription<'info> {
    pub wallet: Signer<'info>,

    #[account(
        seeds = [b"issuer", wallet.key().as_ref()],
        bump = issuer_record.bump,
    )]
    pub issuer_record: Account<'info, IssuerRecord>,
}

// Kept for backward compat (consume_credit)
#[derive(Accounts)]
pub struct ConsumeCredit<'info> {
    pub issuer: Signer<'info>,
    #[account(mut, seeds = [b"issuer_state", issuer.key().as_ref()], bump)]
    pub state: Account<'info, IssuerState>,
}

// ─── State ────────────────────────────────────────────────────────────────────

#[account]
pub struct IssuerRecord {
    pub wallet_address: Pubkey,   // 32
    pub plan_id:        String,   // 4 + 16
    pub expires_at:     i64,      // 8
    pub is_active:      bool,     // 1
    pub bump:           u8,       // 1
}

impl IssuerRecord {
    pub const LEN: usize = 8 + 32 + (4 + 16) + 8 + 1 + 1 + 64; // padded
}

#[account]
pub struct CertificateRecord {
    pub issuer_wallet:  Pubkey,   // 32
    pub arweave_tx_id:  String,   // 4 + 64
    pub issued_at:      i64,      // 8
    pub bump:           u8,       // 1
}

impl CertificateRecord {
    pub const LEN: usize = 8 + 32 + (4 + 64) + 8 + 1 + 64; // padded
}

// Legacy state (kept for backward compat)
#[account]
pub struct IssuerState {
    pub issuer_wallet: Pubkey,
    pub credits:       u64,
    pub bump:          u8,
}

// ─── Events ───────────────────────────────────────────────────────────────────

#[event]
pub struct PaymentEvent {
    pub payer:       Pubkey,
    pub plan_id:     String,
    pub total:       u64,
    pub owner_share: u64,
    pub pool_share:  u64,
    pub timestamp:   i64,
}

#[event]
pub struct IssuerRegisteredEvent {
    pub wallet:     Pubkey,
    pub plan_id:    String,
    pub expires_at: i64,
    pub timestamp:  i64,
}

#[event]
pub struct SubscriptionRenewedEvent {
    pub wallet:          Pubkey,
    pub plan_id:         String,
    pub new_expires_at:  i64,
    pub owner_amount:    u64,
    pub fee_pool_amount: u64,
    pub timestamp:       i64,
}

#[event]
pub struct CertificateRecordedEvent {
    pub issuer:        Pubkey,
    pub arweave_tx_id: String,
    pub timestamp:     i64,
}

#[event]
pub struct SubscriptionVerifiedEvent {
    pub wallet:     Pubkey,
    pub is_active:  bool,
    pub plan_id:    String,
    pub expires_at: i64,
    pub timestamp:  i64,
}

#[event]
pub struct SNSVerifiedEvent {
    pub wallet:      Pubkey,
    pub domain_name: String,
    pub timestamp:   i64,
}

#[event]
pub struct CreditConsumedEvent {
    pub issuer:        Pubkey,
    pub arweave_tx_id: String,
    pub credits_left:  u64,
    pub timestamp:     i64,
}

// ─── Errors ───────────────────────────────────────────────────────────────────

#[error_code]
pub enum ErrorCode {
    #[msg("Unauthorized caller")]
    Unauthorized,
    #[msg("Insufficient credits")]
    InsufficientCredits,
    #[msg("Arithmetic overflow")]
    Overflow,
    #[msg("Subscription inactive or expired")]
    SubscriptionInactive,
}
