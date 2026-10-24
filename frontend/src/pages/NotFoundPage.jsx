import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { EmptyState } from '../components/States';

export default function NotFoundPage() {
  return (
    <div className="card">
      <EmptyState
        icon={Compass}
        title="Page not found"
        message="The page you are looking for does not exist."
        action={
          <Link to="/" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
            Go to dashboard
          </Link>
        }
      />
    </div>
  );
}
