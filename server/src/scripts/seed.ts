import 'dotenv/config'
import { applyMigrations } from '../config/db.js'
import { createUser, getUserByEmail } from '../services/user.service.js'

applyMigrations()

const SEED_USERS = [
  { email: 'ciso@demo.local', name: 'Sarah Chen', password: 'CISOdemo@2026!', role: 'CISO' as const },
  { email: 'analyst@demo.local', name: 'James Park', password: 'SOCdemo@2026!', role: 'SOC_ANALYST' as const },
  { email: 'auditor@demo.local', name: 'Emily Walsh', password: 'AUDITdemo@2026!', role: 'AUDITOR' as const },
  { email: 'exec@demo.local', name: 'Michael Torres', password: 'EXECdemo@2026!', role: 'EXECUTIVE' as const },
]

async function seed() {
  for (const u of SEED_USERS) {
    if (!getUserByEmail(u.email)) {
      await createUser(u)
      console.log(`✅ Created user: ${u.email} (${u.role})`)
    } else {
      console.log(`⏭️  User already exists: ${u.email}`)
    }
  }
  console.log('\n🌱 Seed complete')
  process.exit(0)
}

seed().catch(console.error)
