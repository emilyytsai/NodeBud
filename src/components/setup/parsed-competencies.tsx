import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ParsedJd } from "@/lib/schemas/parsed-jd";

interface ParsedCompetenciesProps {
  parsed: ParsedJd;
  questionCount?: number;
}

export function ParsedCompetencies({ parsed, questionCount }: ParsedCompetenciesProps) {
  const count = questionCount ?? parsed.suggested_question_count;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {parsed.role_title} · {parsed.seniority}
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            {Math.round(parsed.confidence * 100)}% confidence
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Key skills</p>
          <div className="flex flex-wrap gap-2">
            {parsed.hard_skills.map((skill) => (
              <Badge key={skill.name} variant={skill.required ? "default" : "secondary"}>
                {skill.name}
              </Badge>
            ))}
          </div>
        </div>
        {parsed.soft_skills.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Soft skills</p>
            <div className="flex flex-wrap gap-2">
              {parsed.soft_skills.map((skill) => (
                <Badge key={skill} variant="outline">
                  {skill}
                </Badge>
              ))}
            </div>
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          Generating {count} {count === 1 ? "question" : "questions"}
        </p>
      </CardContent>
    </Card>
  );
}
