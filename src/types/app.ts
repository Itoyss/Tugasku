export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarColor: string;
}

export interface PersonalTaskItem {
  id: string;
  userId: string;
  title: string;
  course: string;
  dueDate: string;
  done: boolean;
  remindEnabled: boolean;
}

export interface GroupMemberItem {
  id: string;
  role: string;
  user: UserProfile;
}

export interface GroupTaskItem {
  id: string;
  groupId: string;
  title: string;
  status: "todo" | "doing" | "done" | string;
  dueDate: string;
  assigneeId: string;
  proofText: string | null;
  completedAt: string | null;
  assignee: {
    id: string;
    name: string;
    avatarColor: string;
  };
}

export interface GroupItem {
  id: string;
  name: string;
  course: string;
  inviteCode: string;
  isLocked: boolean;
  ownerId: string;
  myRole: string;
  members: GroupMemberItem[];
  tasks: GroupTaskItem[];
}

export interface NotificationItem {
  id: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}
