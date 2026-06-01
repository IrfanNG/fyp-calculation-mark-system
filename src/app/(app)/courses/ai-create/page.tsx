import AiCreateCourseClient from "./ui";

export default function AiCreateCoursePage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Create Course (AI Mode)</h1>
        <p className="text-sm text-(--unikl-muted)">
          Upload a CLP PDF or paste CLO and assessment text. You can preview and edit before saving.
        </p>
      </div>
      <AiCreateCourseClient />
    </div>
  );
}
