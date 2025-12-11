/**
 * YGGDRASIL Database Seed Script
 *
 * Creates essential system users and initial data required for YGGDRASIL to operate.
 * Run with: pnpm db:seed or npx prisma db seed
 */

import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// System users required for YGGDRASIL operations
const SYSTEM_USERS = [
  {
    id: 'system-yggdrasil-001',
    email: 'system@yggdrasil.local',
    password: 'yggdrasil-system-internal-only',
    role: Role.SYSTEM,
    name: 'YGGDRASIL System',
    organization: 'YGGDRASIL',
  },
  {
    id: 'test-claude-001',
    email: 'claude@yggdrasil.local',
    password: 'test-claude-internal-only',
    role: Role.SYSTEM,
    name: 'Claude Test User',
    organization: 'YGGDRASIL Testing',
  },
  {
    id: 'test-user-001',
    email: 'test@yggdrasil.local',
    password: 'test-password-internal-only',
    role: Role.USER,
    name: 'Test User',
    organization: 'YGGDRASIL Testing',
  },
];

async function main() {
  console.log('🌳 YGGDRASIL Database Seed');
  console.log('==========================\n');

  // Create system users
  for (const user of SYSTEM_USERS) {
    const passwordHash = await bcrypt.hash(user.password, 10);

    const existing = await prisma.user.findUnique({
      where: { id: user.id },
    });

    if (existing) {
      console.log(`  ⏭️  User ${user.email} already exists`);
      continue;
    }

    await prisma.user.create({
      data: {
        id: user.id,
        email: user.email,
        passwordHash,
        role: user.role,
        name: user.name,
        organization: user.organization,
        isActive: true,
      },
    });

    console.log(`  ✅ Created user: ${user.email} (${user.role})`);
  }

  // Create default workspace for test user
  const testUser = await prisma.user.findUnique({
    where: { id: 'test-user-001' },
    include: { profile: true },
  });

  if (testUser && !testUser.profile) {
    await prisma.profile.create({
      data: {
        userId: testUser.id,
        username: 'testuser',
        displayName: 'Test User',
        hasOnboarded: true,
      },
    });
    console.log('  ✅ Created profile for test user');
  }

  // Check for existing workspace
  const existingWorkspace = await prisma.workspace.findFirst({
    where: {
      userId: 'test-user-001',
      isHome: true,
    },
  });

  if (!existingWorkspace) {
    await prisma.workspace.create({
      data: {
        userId: 'test-user-001',
        name: 'Home',
        description: 'Default workspace for testing',
        isHome: true,
        defaultModel: 'yggdrasil',
        defaultPrompt: 'You are YGGDRASIL, an AI system committed to truth and verifiability.',
      },
    });
    console.log('  ✅ Created default workspace for test user');
  }

  console.log('\n🌳 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
