import { Link, useLocation } from "wouter";
import {
  Handshake,
  LogOut,
  User,
  Menu,
  X,
  Home,
  BarChart3,
  Users,
  Settings,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export default function Navigation() {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const authData = useAuth();
  const { user, isAuthenticated, logout, isLoggingOut } = authData;

  console.log("Navigation authData:", {
    isAuthenticated: authData.isAuthenticated,
    hasUser: !!authData.user,
    hasLogout: typeof authData.logout === "function",
    isLoading: authData.isLoading,
  });

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white shadow-sm border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
              <Handshake className="text-white text-sm" size={16} />
            </div>
            <span className="text-xl font-bold text-gray-900">Naeborly</span>
          </Link>

          <div className="hidden md:flex items-center space-x-6">
            <Link href="/">
              <Button
                variant={location === "/" ? "default" : "ghost"}
                className={
                  location === "/"
                    ? "bg-blue-600 hover:bg-blue-700"
                    : "text-gray-600 hover:text-blue-600"
                }
              >
                Home
              </Button>
            </Link>

            {isAuthenticated ? (
              <>
                {/* Show dashboard based on user role */}
                {user?.role === "sales_rep" && (
                  <Link href="/sales-dashboard">
                    <Button
                      variant={
                        location === "/sales-dashboard" ? "default" : "ghost"
                      }
                      className={
                        location === "/sales-dashboard"
                          ? "bg-blue-600 hover:bg-blue-700"
                          : "text-gray-600 hover:text-blue-600"
                      }
                    >
                      Sales Dashboard
                    </Button>
                  </Link>
                )}

                {user?.role === "decision_maker" && (
                  <Link href="/decision-dashboard">
                    <Button
                      variant={
                        location === "/decision-dashboard" ? "default" : "ghost"
                      }
                      className={
                        location === "/decision-dashboard"
                          ? "bg-blue-600 hover:bg-blue-700"
                          : "text-gray-600 hover:text-blue-600"
                      }
                    >
                      Decision Dashboard
                    </Button>
                  </Link>
                )}

                {user?.role === "admin" && (
                  <Link href="/admin">
                    <Button
                      variant={location === "/admin" ? "default" : "ghost"}
                      className={
                        location === "/admin"
                          ? "bg-red-600 hover:bg-red-700"
                          : "text-gray-600 hover:text-red-600"
                      }
                    >
                      Admin Panel
                    </Button>
                  </Link>
                )}

                {user?.role === "enterprise_admin" && (
                  <Link href="/enterprise-admin">
                    <Button
                      variant={
                        location === "/enterprise-admin" ? "default" : "ghost"
                      }
                      className={
                        location === "/enterprise-admin"
                          ? "bg-blue-600 hover:bg-blue-700"
                          : "text-gray-600 hover:text-blue-600"
                      }
                    >
                      Enterprise Admin
                    </Button>
                  </Link>
                )}

                {/* User dropdown menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="flex items-center space-x-2"
                    >
                      <User size={16} />
                      <span className="text-gray-700">
                        {user?.firstName} {user?.lastName}
                      </span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>My Account</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-gray-600">
                      {user?.email}
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-gray-600 capitalize">
                      {user?.role?.replace("_", " ")}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/analytics" className="w-full cursor-pointer">
                        <BarChart3 className="mr-2 h-4 w-4" />
                        View Analytics
                      </Link>
                    </DropdownMenuItem>
                    {user?.role === "sales_rep" && (
                      <DropdownMenuItem asChild>
                        <Link href="/profile" className="w-full cursor-pointer">
                          <User className="mr-2 h-4 w-4" />
                          Account Settings
                        </Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem asChild>
                      <Link href="/help" className="w-full cursor-pointer">
                        <HelpCircle className="mr-2 h-4 w-4" />
                        Help & Support
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.preventDefault();
                        // Direct logout implementation
                        localStorage.removeItem("naeborly_token");
                        localStorage.clear();
                        sessionStorage.clear();
                        window.location.replace("/");
                      }}
                      className="text-red-600 cursor-pointer"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      {isLoggingOut ? "Signing out..." : "Sign out"}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              /* Show Sign In button when not authenticated */
              <Link href="/login">
                <Button className="bg-blue-600 text-white hover:bg-blue-700">
                  Sign In
                </Button>
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="right"
                className="w-[320px] sm:w-[400px] bg-gradient-to-br from-slate-50 to-blue-50"
              >
                <SheetHeader className="pb-6">
                  <SheetTitle className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg">
                      <Handshake className="text-white" size={20} />
                    </div>
                    <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">
                      Naeborly
                    </span>
                  </SheetTitle>
                  <SheetDescription className="text-slate-600 text-sm">
                    Professional networking made simple
                  </SheetDescription>
                </SheetHeader>

                <div className="flex flex-col space-y-3">
                  {/* Navigation Links */}
                  <div className="space-y-2">
                    <Link href="/" onClick={() => setIsMobileMenuOpen(false)}>
                      <Button
                        variant={location === "/" ? "default" : "ghost"}
                        className={`w-full justify-start h-12 rounded-xl transition-all duration-200 ${
                          location === "/"
                            ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg transform scale-[1.02]"
                            : "text-slate-700 hover:bg-white/60 hover:text-blue-600 hover:shadow-md"
                        }`}
                      >
                        <Home className="mr-3" size={18} />
                        <span className="font-medium">Home</span>
                      </Button>
                    </Link>

                    {isAuthenticated ? (
                      <>
                        {/* Dashboard Links with Icons */}
                        {user?.role === "sales_rep" && (
                          <>
                            <Link
                              href="/sales-dashboard"
                              onClick={() => setIsMobileMenuOpen(false)}
                            >
                              <Button
                                variant={
                                  location === "/sales-dashboard"
                                    ? "default"
                                    : "ghost"
                                }
                                className={`w-full justify-start h-12 rounded-xl transition-all duration-200 ${
                                  location === "/sales-dashboard"
                                    ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg transform scale-[1.02]"
                                    : "text-slate-700 hover:bg-white/60 hover:text-blue-600 hover:shadow-md"
                                }`}
                              >
                                <BarChart3 className="mr-3" size={18} />
                                <span className="font-medium">
                                  Sales Dashboard
                                </span>
                              </Button>
                            </Link>

                            <Link
                              href="/profile"
                              onClick={() => setIsMobileMenuOpen(false)}
                            >
                              <Button
                                variant={
                                  location === "/profile" ? "default" : "ghost"
                                }
                                className={`w-full justify-start h-12 rounded-xl transition-all duration-200 ${
                                  location === "/profile"
                                    ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg transform scale-[1.02]"
                                    : "text-slate-700 hover:bg-white/60 hover:text-blue-600 hover:shadow-md"
                                }`}
                              >
                                <User className="mr-3" size={18} />
                                <span className="font-medium">Profile</span>
                              </Button>
                            </Link>
                          </>
                        )}

                        {user?.role === "decision_maker" && (
                          <Link
                            href="/decision-dashboard"
                            onClick={() => setIsMobileMenuOpen(false)}
                          >
                            <Button
                              variant={
                                location === "/decision-dashboard"
                                  ? "default"
                                  : "ghost"
                              }
                              className={`w-full justify-start h-12 rounded-xl transition-all duration-200 ${
                                location === "/decision-dashboard"
                                  ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg transform scale-[1.02]"
                                  : "text-slate-700 hover:bg-white/60 hover:text-blue-600 hover:shadow-md"
                              }`}
                            >
                              <Users className="mr-3" size={18} />
                              <span className="font-medium">
                                Decision Dashboard
                              </span>
                            </Button>
                          </Link>
                        )}

                        {user?.role === "admin" && (
                          <Link
                            href="/admin"
                            onClick={() => setIsMobileMenuOpen(false)}
                          >
                            <Button
                              variant={
                                location === "/admin" ? "default" : "ghost"
                              }
                              className={`w-full justify-start h-12 rounded-xl transition-all duration-200 ${
                                location === "/admin"
                                  ? "bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg transform scale-[1.02]"
                                  : "text-slate-700 hover:bg-red-50 hover:text-red-600 hover:shadow-md"
                              }`}
                            >
                              <Settings className="mr-3" size={18} />
                              <span className="font-medium">Admin Panel</span>
                            </Button>
                          </Link>
                        )}

                        {user?.role === "enterprise_admin" && (
                          <Link
                            href="/enterprise-admin"
                            onClick={() => setIsMobileMenuOpen(false)}
                          >
                            <Button
                              variant={
                                location === "/enterprise-admin"
                                  ? "default"
                                  : "ghost"
                              }
                              className={`w-full justify-start h-12 rounded-xl transition-all duration-200 ${
                                location === "/enterprise-admin"
                                  ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg transform scale-[1.02]"
                                  : "text-slate-700 hover:bg-white/60 hover:text-blue-600 hover:shadow-md"
                              }`}
                            >
                              <Users className="mr-3" size={18} />
                              <span className="font-medium">
                                Enterprise Admin
                              </span>
                            </Button>
                          </Link>
                        )}
                      </>
                    ) : (
                      /* Attractive Sign In button for unauthenticated users */
                      <div className="pt-4">
                        <Link
                          href="/login"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          <Button className="w-full justify-start h-12 bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]">
                            <User className="mr-3" size={18} />
                            <span className="font-semibold">Sign In</span>
                          </Button>
                        </Link>

                        <div className="mt-4 p-4 bg-white/50 rounded-xl backdrop-blur-sm border border-white/20">
                          <p className="text-sm text-slate-600 text-center leading-relaxed">
                            Connect with decision makers and grow your business
                            network
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* User Profile Section for authenticated users */}
                  {isAuthenticated && (
                    <div className="border-t border-white/30 pt-6 mt-6">
                      <div className="bg-white/60 rounded-xl p-4 backdrop-blur-sm border border-white/20 shadow-sm">
                        <div className="flex items-center space-x-3 mb-4">
                          <div className="w-12 h-12 bg-gradient-to-r from-blue-100 to-blue-200 rounded-full flex items-center justify-center shadow-inner">
                            <User className="text-blue-600" size={24} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-slate-900 truncate">
                              {user?.firstName} {user?.lastName}
                            </p>
                            <p className="text-sm text-slate-600 truncate">
                              {user?.email}
                            </p>
                            <p className="text-xs text-slate-500 capitalize font-medium">
                              {user?.role?.replace("_", " ")}
                            </p>
                          </div>
                        </div>

                        <Button
                          variant="ghost"
                          className="w-full justify-start h-10 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all duration-200"
                          onClick={(e) => {
                            e.preventDefault();
                            localStorage.removeItem("naeborly_token");
                            localStorage.clear();
                            sessionStorage.clear();
                            setIsMobileMenuOpen(false);
                            window.location.replace("/");
                          }}
                        >
                          <LogOut className="mr-2 h-4 w-4" />
                          <span className="font-medium">
                            {isLoggingOut ? "Signing out..." : "Sign out"}
                          </span>
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
}
