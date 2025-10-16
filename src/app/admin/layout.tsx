import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  ClipboardCheck,
  DollarSign,
  LogOut,
} from "lucide-react";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // TODO: Re-enable auth when switching to Clerk
  // const supabase = await createClient();
  // const { data: { session } } = await supabase.auth.getSession();
  // if (!session) redirect('/');
  // const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',') || [];
  // const isAdmin = adminEmails.includes(session.user.email || '');
  // if (!isAdmin) redirect('/');

  // Temporary hardcoded email for dev
  const userEmail = "admin@plantintel.com";

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-gray-200">
            <h1 className="text-xl font-bold">Plant Intel Admin</h1>
            <p className="text-sm text-gray-500 mt-1">{userEmail}</p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            <Link
              href="/admin"
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <LayoutDashboard className="h-5 w-5 text-gray-600" />
              <span className="font-medium">Dashboard</span>
            </Link>

            <Link
              href="/admin/customers"
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Users className="h-5 w-5 text-gray-600" />
              <span className="font-medium">Customers</span>
            </Link>

            <Link
              href="/admin/reviews"
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ClipboardCheck className="h-5 w-5 text-gray-600" />
              <span className="font-medium">Reviews</span>
            </Link>

            <Link
              href="/admin/roi"
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <DollarSign className="h-5 w-5 text-gray-600" />
              <span className="font-medium">ROI Tracking</span>
            </Link>
          </nav>

          {/* Logout */}
          <div className="p-4 border-t border-gray-200">
            <Link
              href="/"
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors w-full text-left"
            >
              <LogOut className="h-5 w-5 text-gray-600" />
              <span className="font-medium">Back to App</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  );
}
