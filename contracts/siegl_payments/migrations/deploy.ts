// Migrations are an early anchor feature and have since been deprecated.
// To run a custom deployment script, execute it with `anchor run <script>`.
// Simple deployment: `anchor deploy`
const anchor = require("@coral-xyz/anchor");

module.exports = async function (provider: typeof anchor.Provider) {
  anchor.setProvider(provider);
  // No on-chain state to initialize — the program is stateless at deploy time.
  // IssuerState PDAs are created lazily per issuer via consume_credit.
  console.log("siegl_payments deployed. Program ID:", provider.wallet.publicKey.toBase58());
};
