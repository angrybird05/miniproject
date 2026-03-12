import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md text-center">
        <p className="text-8xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-sky-500 to-emerald-400">
          404
        </p>
        <h1 className="mt-4 text-2xl font-semibold text-slate-900">
          Page not found
        </h1>
        <p className="mt-3 text-sm text-slate-500">
          The page you are looking for doesn&apos;t exist or has been moved.
        </p>
        <Link to="/">
          <Button className="mt-6">
            <Home className="h-4 w-4" />
            Back to Home
          </Button>
        </Link>
      </div>
    </div>
  );
}
