import { supabaseAdmin } from '@/lib/supabase'
import { notFound } from 'next/navigation'

export default async function CreatorProfilePage({ params }: { params: { slug: string } }) {
  const { data: creator } = await supabaseAdmin
    .from('creators')
    .select('*')
    .eq('slug', params.slug)
    .single()

  if (!creator) notFound()

  const { data: content } = await supabaseAdmin
    .from('creator_content')
    .select('*')
    .eq('creator_wallet', creator.wallet_address)
    .eq('is_premium', false)
    .order('created_at', { ascending: false })
    .limit(20)

  return (
    <div style={{ minHeight: '100vh', padding: 'clamp(24px,5vw,48px) clamp(16px,5vw,40px)' }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <div className="glass-card" style={{ marginBottom: 32 }}>
          <h1 style={{ fontFamily: 'Luna, sans-serif', fontWeight: 800, fontSize: 28, color: '#F0F8FF', marginBottom: 8 }}>
            {creator.display_name}
          </h1>
          <p style={{ fontSize: 12, color: 'rgba(180,210,255,0.4)', fontFamily: 'Luna, sans-serif', marginBottom: creator.bio ? 16 : 0 }}>
            /create/{creator.slug} · {creator.subscribers_count} suscriptores
          </p>
          {creator.bio && (
            <p style={{ fontSize: 14, color: 'rgba(180,210,255,0.7)', lineHeight: 1.7 }}>{creator.bio}</p>
          )}
        </div>

        {(content ?? []).length === 0 ? (
          <div className="glass-card" style={{ textAlign: 'center', padding: 48, color: 'rgba(180,210,255,0.4)' }}>
            Este creador aún no publicó contenido público.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>
            {(content ?? []).map(item => (
              <div key={item.id} className="glass-card" style={{ padding: 20 }}>
                {item.thumbnail_url && (
                  <img src={item.thumbnail_url} alt={item.title} style={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: 8, marginBottom: 12 }} />
                )}
                <p style={{ fontWeight: 700, fontSize: 15, color: '#F0F8FF', fontFamily: 'Luna, sans-serif', marginBottom: 6 }}>{item.title}</p>
                {item.description && (
                  <p style={{ fontSize: 13, color: 'rgba(180,210,255,0.6)', lineHeight: 1.5 }}>{item.description}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
