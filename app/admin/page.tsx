import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Users, Activity, Sparkles, ArrowRight } from 'lucide-react';
import { getCurrentUser } from '@/lib/session';
import { prisma } from '@/lib/prisma';

async function isManagementEmail(email: string | null | undefined) {
  const configuredAdminEmails = (process.env.ADMIN_EMAILS || 'admin@easeforbusiness.com')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  const isConfiguredAdmin = !!email && configuredAdminEmails.includes(email.toLowerCase());

  if (isConfiguredAdmin) {
    return true;
  }

  if (!email || process.env.ADMIN_EMAILS) {
    return false;
  }

  const firstUser = await prisma.user.findFirst({
    where: {},
    orderBy: { createdAt: 'asc' },
    select: { email: true },
  });

  return !!firstUser?.email && firstUser.email.toLowerCase() === email.toLowerCase();
}

async function getAdminOverview() {
  const [totalUsers, activeUsers, subscribedUsers] = await Promise.all([
    prisma.user.count(),
    prisma.session
      .findMany({
        where: { expiresAt: { gt: new Date() } },
        select: { userId: true },
        distinct: ['userId'],
      })
      .then((sessions) => sessions.length),
    prisma.user.count({ where: { isSubscribed: true } }),
  ]);

  return {
    totalUsers,
    activeUsers,
    subscribedUsers,
  };
}

export default async function AdminPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect('/auth/signin');
  }

  if (!(await isManagementEmail(currentUser.email))) {
    redirect('/dashboard');
  }

  const stats = await getAdminOverview();

  const cards = [
    {
      title: 'Total signups',
      value: stats.totalUsers,
      description: 'Users who have created an account in your app.',
      icon: Users,
      accent: 'from-orange-500 to-amber-500',
    },
    {
      title: 'Currently active',
      value: stats.activeUsers,
      description: 'Users with an active session right now.',
      icon: Activity,
      accent: 'from-emerald-500 to-green-600',
    },
    {
      title: 'Subscribed users',
      value: stats.subscribedUsers,
      description: 'Users who are currently marked as subscribed.',
      icon: Sparkles,
      accent: 'from-violet-500 to-fuchsia-600',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-600">Admin Overview</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">See the pulse of your app at a glance</h1>
          <p className="mt-3 max-w-2xl text-lg text-slate-600">
            Track how many people have signed up, how many are currently active, and how many users are subscribed.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className={`inline-flex rounded-2xl bg-gradient-to-r ${card.accent} p-3 text-white`}>
                  <Icon size={24} />
                </div>
                <p className="mt-5 text-sm font-medium text-slate-500">{card.title}</p>
                <p className="mt-2 text-4xl font-bold text-slate-900">{card.value}</p>
                <p className="mt-3 text-sm text-slate-600">{card.description}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Quick actions</h2>
              <p className="mt-2 text-sm text-slate-600">Jump back into your business dashboard or review the rest of the app.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-700"
              >
                Open business dashboard
                <ArrowRight size={16} />
              </Link>
              <Link
                href="/inventory"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Review inventory
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
