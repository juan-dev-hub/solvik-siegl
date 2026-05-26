import { Connection } from '@solana/web3.js'

let _connection: Connection | null = null

export function getConnection(): Connection {
  if (!_connection) {
    _connection = new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC!, 'confirmed')
  }
  return _connection
}
