export const dynamic = 'force-dynamic'

export async function GET() {
  return Response.json({
    db: process.env.DATABASE_URL?.slice(0, 30),
    direct: process.env.DIRECT_URL?.slice(0, 30),
  })
}