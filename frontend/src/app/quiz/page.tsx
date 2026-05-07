import Link from "next/link";

export default function QuizListPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-foreground">My Quizzes</h1>
      <p className="text-muted-foreground">Danh sach quiz se hien thi tai day.</p>
      <Link href="/quiz/create" className="text-primary hover:underline">
        Tao quiz moi
      </Link>
    </div>
  );
}
