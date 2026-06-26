export type UserRole = 'STUDENT' | 'TEACHER' | 'ADMIN';

export type AuthUser = {
  id: string;
  role: UserRole;
  email: string | null;
  displayName: string;
  controlNumber?: string;
  group?: string | null;
};

export type LoginResponse = {
  accessToken: string;
  user: AuthUser;
};

export type AvailableExam = {
  id: string;
  title: string;
  description: string | null;
  durationMinutes: number | null;
  startsAt: string | null;
  endsAt: string | null;
  oneAttemptOnly: boolean;
  questionCount: number;
  maxScore: number;
  attempt: {
    id: string;
    status: string;
    startedAt: string;
    submittedAt: string | null;
    percentage: number;
  } | null;
  canStart: boolean;
};

export type TeacherExam = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  accessCode: string | null;
  durationMinutes: number | null;
  questionCount: number;
  maxScore: number;
  attemptCount: number;
  evaluatedAttemptCount: number;
  average: number;
  createdAt: string;
};

export type TeacherStudent = {
  id: string;
  userId: string;
  controlNumber: string;
  fullName: string;
  group: string | null;
  isActive: boolean;
  createdAt: string;
  attempts: {
    id: string;
    examId: string;
    examTitle: string;
    status: string;
    totalScore: number;
    maxScore: number;
    percentage: number;
    startedAt: string;
    submittedAt: string | null;
  }[];
};
