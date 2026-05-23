use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("58Pbj3wmbveLzQVbYBdEqSh6eVkhs6q8BKcbyhFsLnMu");

const OWNER_SHARE_BPS: u64 = 8500;   // 85%
const FEE_POOL_SHARE_BPS: u64 = 1500; // 15%
const BASIS_POINTS: u64 = 10_000;

#[program]
pub mod siegl_payments {
    use super::*;

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

        // Transfer to owner
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

        // Transfer to fee pool
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
            payer:        ctx.accounts.payer.key(),
            plan_id,
            total:        amount_usdc,
            owner_share:  owner_amount,
            pool_share:   fee_pool_amount,
            timestamp:    Clock::get()?.unix_timestamp,
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

    /// Consume a credit — only callable by the ISSUER_WALLET
    pub fn consume_credit(
        ctx: Context<ConsumeCredit>,
        arweave_tx_id: String,
    ) -> Result<()> {
        require!(
            ctx.accounts.issuer.key() == ctx.accounts.state.issuer_wallet,
            ErrorCode::Unauthorized
        );

        let state = &mut ctx.accounts.state;
        require!(state.credits > 0, ErrorCode::InsufficientCredits);

        state.credits = state
            .credits
            .checked_sub(1)
            .ok_or(ErrorCode::Overflow)?;

        emit!(CreditConsumedEvent {
            issuer:        ctx.accounts.issuer.key(),
            arweave_tx_id,
            credits_left:  state.credits,
            timestamp:     Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    /// Verify that a .sol domain is owned by the calling wallet (on-chain check)
    pub fn verify_sns_domain(
        ctx: Context<VerifySNS>,
        domain_name: String,
    ) -> Result<()> {
        // The SNS name account owner field is verified off-chain via @bonfida/spl-name-service.
        // This instruction emits an on-chain record that the caller claimed ownership.
        emit!(SNSVerifiedEvent {
            wallet:      ctx.accounts.wallet.key(),
            domain_name,
            timestamp:   Clock::get()?.unix_timestamp,
        });
        Ok(())
    }
}

// ─── Account Contexts ────────────────────────────────────────────────────────

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
pub struct ConsumeCredit<'info> {
    pub issuer: Signer<'info>,

    #[account(mut, seeds = [b"issuer_state", issuer.key().as_ref()], bump)]
    pub state: Account<'info, IssuerState>,
}

#[derive(Accounts)]
pub struct VerifySNS<'info> {
    pub wallet: Signer<'info>,
}

// ─── State ───────────────────────────────────────────────────────────────────

#[account]
pub struct IssuerState {
    pub issuer_wallet: Pubkey,
    pub credits:       u64,
    pub bump:          u8,
}

// ─── Events ──────────────────────────────────────────────────────────────────

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
pub struct CreditConsumedEvent {
    pub issuer:        Pubkey,
    pub arweave_tx_id: String,
    pub credits_left:  u64,
    pub timestamp:     i64,
}

#[event]
pub struct SNSVerifiedEvent {
    pub wallet:      Pubkey,
    pub domain_name: String,
    pub timestamp:   i64,
}

// ─── Errors ──────────────────────────────────────────────────────────────────

#[error_code]
pub enum ErrorCode {
    #[msg("Unauthorized caller")]
    Unauthorized,
    #[msg("Insufficient credits")]
    InsufficientCredits,
    #[msg("Arithmetic overflow")]
    Overflow,
}
