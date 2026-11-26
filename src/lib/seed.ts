import { prisma } from "./prisma";
import { hashPassword } from "./auth";
import { dateFromPresetOrIso } from "./helpers";

let seededPromise: Promise<void> | null = null;

/** Seed initial demo accounts, personal tasks, and a sample group once on an empty database. */
export async function ensureDemoData(): Promise<void> {
  if (!seededPromise) {
    seededPromise = runSeed().catch((err) => {
      seededPromise = null;
      throw err;
    });
  }
  return seededPromise;
}

async function runSeed(): Promise<void> {
  const existingUsers = await prisma.user.count();
  if (existingUsers > 0) return;

  const passwordHash = hashPassword("mahasiswa");

  const [rafi, sinta, dimas] = await Promise.all([
    prisma.user.create({
      data: {
        name: "Rafi Pratama",
        email: "rafi@kampus.ac.id",
        passwordHash,
        avatarColor: "indigo",
      },
    }),
    prisma.user.create({
      data: {
        name: "Sinta Wijaya",
        email: "sinta@kampus.ac.id",
        passwordHash,
        avatarColor: "rose",
      },
    }),
    prisma.user.create({
      data: {
        name: "Dimas Saputra",
        email: "dimas@kampus.ac.id",
        passwordHash,
        avatarColor: "amber",
      },
    }),
  ]);

  await prisma.personalTask.createMany({
    data: [
      {
        userId: rafi.id,
        title: "Upload Resume Jurnal Pertemuan 5",
        course: "Basis Data",
        dueDate: dateFromPresetOrIso("today"),
        done: false,
        remindEnabled: true,
      },
      {
        userId: rafi.id,
        title: "Kerjakan Kuis Online CSS Grid",
        course: "Pemrograman Web",
        dueDate: dateFromPresetOrIso("tomorrow"),
        done: false,
        remindEnabled: true,
      },
      {
        userId: rafi.id,
        title: "Install Cisco Packet Tracer",
        course: "Jaringan",
        dueDate: dateFromPresetOrIso("3days"),
        done: true,
        remindEnabled: false,
      },
    ],
  });

  const group = await prisma.group.create({
    data: {
      name: "Project Basis Data",
      course: "Sistem Basis Data",
      inviteCode: "KLP-4B202",
      ownerId: rafi.id,
      members: {
        create: [
          { userId: rafi.id, role: "owner" },
          { userId: sinta.id, role: "member" },
          { userId: dimas.id, role: "member" },
        ],
      },
    },
  });

  await prisma.groupTask.createMany({
    data: [
      {
        groupId: group.id,
        title: "Rancang ERD & Relasi Tabel",
        status: "done",
        dueDate: dateFromPresetOrIso("5days"),
        assigneeId: rafi.id,
        createdById: rafi.id,
        proofText: "https://dbdiagram.io/d/kel-4b-erd",
        completedAt: new Date(),
      },
      {
        groupId: group.id,
        title: "Bikin Slide Presentasi Bab 1-2",
        status: "done",
        dueDate: dateFromPresetOrIso("3days"),
        assigneeId: sinta.id,
        createdById: rafi.id,
        proofText: "Sudah di-upload ke Canva folder kelompok",
        completedAt: new Date(),
      },
      {
        groupId: group.id,
        title: "Implementasi Query SQL & Dummy Data",
        status: "doing",
        dueDate: dateFromPresetOrIso("tomorrow"),
        assigneeId: rafi.id,
        createdById: rafi.id,
      },
      {
        groupId: group.id,
        title: "Tulis Bab 3 Pembahasan & Kesimpulan",
        status: "todo",
        dueDate: dateFromPresetOrIso("today"),
        assigneeId: dimas.id,
        createdById: rafi.id,
      },
    ],
  });

  await prisma.notification.createMany({
    data: [
      {
        userId: rafi.id,
        message: 'Reminder: "Upload Resume Jurnal Pertemuan 5" deadline Hari ini.',
        type: "reminder",
      },
      {
        userId: rafi.id,
        message: 'Sinta Wijaya menyelesaikan "Bikin Slide Presentasi Bab 1-2".',
        type: "done",
      },
    ],
  });
}
