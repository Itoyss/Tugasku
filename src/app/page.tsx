import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureDemoData } from "@/lib/seed";
import { DashboardApp } from "@/components/DashboardApp";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  await ensureDemoData();
  const user = await getCurrentUser();

  if (!user) {
    return (
      <DashboardApp
        initialUser={null}
        initialPersonalTasks={[]}
        initialGroups={[]}
        initialNotifications={[]}
      />
    );
  }

  const [personalTasks, memberships, notifications] = await Promise.all([
    prisma.personalTask.findMany({
      where: { userId: user.id },
      orderBy: [{ done: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
    }),
    prisma.groupMember.findMany({
      where: { userId: user.id },
      include: {
        group: {
          include: {
            members: {
              include: {
                user: {
                  select: { id: true, name: true, email: true, avatarColor: true },
                },
              },
              orderBy: { joinedAt: "asc" },
            },
            tasks: {
              include: {
                assignee: {
                  select: { id: true, name: true, avatarColor: true },
                },
              },
              orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
            },
          },
        },
      },
      orderBy: { joinedAt: "desc" },
    }),
    prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 25,
    }),
  ]);

  return (
    <DashboardApp
      initialUser={user}
      initialPersonalTasks={personalTasks.map((t) => ({
        ...t,
        dueDate: t.dueDate.toISOString(),
      }))}
      initialGroups={memberships.map((m) => ({
        ...m.group,
        myRole: m.role,
        members: m.group.members.map((gm) => ({
          id: gm.id,
          role: gm.role,
          user: gm.user,
        })),
        tasks: m.group.tasks.map((gt) => ({
          ...gt,
          dueDate: gt.dueDate.toISOString(),
          completedAt: gt.completedAt ? gt.completedAt.toISOString() : null,
        })),
      }))}
      initialNotifications={notifications.map((n) => ({
        ...n,
        createdAt: n.createdAt.toISOString(),
      }))}
    />
  );
}
