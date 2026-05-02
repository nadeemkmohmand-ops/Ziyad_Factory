import { createFileRoute, Link } from "@tanstack/react-router";
import { Protected } from "@/components/Protected";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export const Route = createFileRoute("/marble/photos")({
  component: () => (
    <Protected>
      <div>
        <PageHeader
          title="Marble Photos"
          urdu="ماربل تصاویر"
          subtitle="Photo galleries are managed inside each category."
        />
        <Card className="p-10 text-center">
          <p className="text-muted-foreground mb-4">
            Open a category and click "Photos" to upload, caption and reorder images.
          </p>
          <Button asChild className="bg-primary text-primary-foreground">
            <Link to="/marble/categories">
              Go to Categories <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </Card>
      </div>
    </Protected>
  ),
});
