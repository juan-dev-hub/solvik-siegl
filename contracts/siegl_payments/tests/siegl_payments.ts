import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SieglPayments } from "../target/types/siegl_payments";
import {
  createMint,
  createAccount,
  mintTo,
  getAccount,
} from "@solana/spl-token";
import { expect } from "chai";

describe("siegl_payments", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.SieglPayments as Program<SieglPayments>;
  const connection = provider.connection;
  const wallet = provider.wallet as anchor.Wallet;

  let usdcMint: anchor.web3.PublicKey;
  let payerTokenAccount: anchor.web3.PublicKey;
  let ownerTokenAccount: anchor.web3.PublicKey;
  let feePoolTokenAccount: anchor.web3.PublicKey;

  const owner = anchor.web3.Keypair.generate();
  const feePool = anchor.web3.Keypair.generate();

  before(async () => {
    // Fund helper accounts
    await Promise.all([
      connection.requestAirdrop(owner.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL),
      connection.requestAirdrop(feePool.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL),
    ]);
    await new Promise(r => setTimeout(r, 1000));

    // Create mock USDC mint (6 decimals)
    usdcMint = await createMint(
      connection,
      wallet.payer,
      wallet.publicKey,
      null,
      6
    );

    // Create token accounts
    payerTokenAccount = await createAccount(connection, wallet.payer, usdcMint, wallet.publicKey);
    ownerTokenAccount = await createAccount(connection, wallet.payer, usdcMint, owner.publicKey);
    feePoolTokenAccount = await createAccount(connection, wallet.payer, usdcMint, feePool.publicKey);

    // Mint 1000 USDC to payer (1_000_000_000 with 6 decimals)
    await mintTo(connection, wallet.payer, usdcMint, payerTokenAccount, wallet.publicKey, 1_000_000_000);
  });

  it("purchase_subscription splits 85/15", async () => {
    const amountUsdc = new anchor.BN(25_000_000); // $25 with 6 decimals

    const ownerBefore = await getAccount(connection, ownerTokenAccount);
    const feePoolBefore = await getAccount(connection, feePoolTokenAccount);

    await program.methods
      .purchaseSubscription("pro", amountUsdc)
      .accounts({
        payer: wallet.publicKey,
        payerToken: payerTokenAccount,
        ownerToken: ownerTokenAccount,
        feePoolToken: feePoolTokenAccount,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
      })
      .rpc();

    const ownerAfter = await getAccount(connection, ownerTokenAccount);
    const feePoolAfter = await getAccount(connection, feePoolTokenAccount);

    const ownerReceived = BigInt(ownerAfter.amount) - BigInt(ownerBefore.amount);
    const feePoolReceived = BigInt(feePoolAfter.amount) - BigInt(feePoolBefore.amount);

    // 85% of 25_000_000 = 21_250_000
    expect(ownerReceived.toString()).to.equal("21250000");
    // 15% of 25_000_000 = 3_750_000
    expect(feePoolReceived.toString()).to.equal("3750000");
    expect((ownerReceived + feePoolReceived).toString()).to.equal(amountUsdc.toString());
  });

  it("purchase_credits_extra splits 85/15", async () => {
    const amountUsdc = new anchor.BN(5_000_000); // $5

    const ownerBefore = await getAccount(connection, ownerTokenAccount);
    const feePoolBefore = await getAccount(connection, feePoolTokenAccount);

    await program.methods
      .purchaseCreditsExtra("mini", amountUsdc)
      .accounts({
        payer: wallet.publicKey,
        payerToken: payerTokenAccount,
        ownerToken: ownerTokenAccount,
        feePoolToken: feePoolTokenAccount,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
      })
      .rpc();

    const ownerAfter = await getAccount(connection, ownerTokenAccount);
    const feePoolAfter = await getAccount(connection, feePoolTokenAccount);

    const ownerReceived = BigInt(ownerAfter.amount) - BigInt(ownerBefore.amount);
    const feePoolReceived = BigInt(feePoolAfter.amount) - BigInt(feePoolBefore.amount);

    // 85% of 5_000_000 = 4_250_000
    expect(ownerReceived.toString()).to.equal("4250000");
    expect(feePoolReceived.toString()).to.equal("750000");
  });

  it("consume_credit requires issuer_wallet authority", async () => {
    const unauthorized = anchor.web3.Keypair.generate();
    await connection.requestAirdrop(unauthorized.publicKey, anchor.web3.LAMPORTS_PER_SOL);
    await new Promise(r => setTimeout(r, 500));

    // Derive PDA for wallet (the real issuer)
    const [statePda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("issuer_state"), wallet.publicKey.toBuffer()],
      program.programId
    );

    // Attempt consume_credit with wrong signer should fail
    try {
      await program.methods
        .consumeCredit("fake_arweave_tx")
        .accounts({
          issuer: unauthorized.publicKey,
          state: statePda,
        })
        .signers([unauthorized])
        .rpc();
      expect.fail("Should have thrown");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      expect(msg).to.include("Error");
    }
  });

  it("verify_sns_domain emits SNSVerifiedEvent", async () => {
    let eventFired = false;

    const listener = program.addEventListener("SNSVerifiedEvent", (event) => {
      expect(event.wallet.toBase58()).to.equal(wallet.publicKey.toBase58());
      expect(event.domainName).to.equal("myinstitution.sol");
      eventFired = true;
    });

    await program.methods
      .verifySNSDomain("myinstitution.sol")
      .accounts({ wallet: wallet.publicKey })
      .rpc();

    await new Promise(r => setTimeout(r, 500));
    await program.removeEventListener(listener);

    expect(eventFired).to.be.true;
  });
});
