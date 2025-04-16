import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Github, User, Building2, Key, ChevronRight, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.3,
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

export const AuthPage = () => {
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [profileType, setProfileType] = useState("user");
  const navigate = useNavigate();

  useEffect(() => {
    // Check if token exists in localStorage
    const storedToken = localStorage.getItem('github_token');
    const storedType = localStorage.getItem('profile_type');
    if (storedToken) {
      setToken(storedToken);
    }
    if (storedType) {
      setProfileType(storedType);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!token.trim()) {
      toast.error("Please enter a GitHub token");
      return;
    }

    // Store token and type in localStorage
    localStorage.setItem('github_token', token);
    localStorage.setItem('profile_type', profileType);

    // Show success message
    toast.success("Successfully connected to GitHub!");

    // Navigate to home page
    navigate('/');
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero Section with Animated Background */}
      <div className="relative w-full h-64 bg-gradient-to-br from-violet-600 via-blue-600 to-cyan-600 overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-background/0" />
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-10 container pt-16 text-center"
        >
          <Github className="w-16 h-16 mx-auto mb-4 text-white" />
          <h1 className="text-4xl font-bold text-white mb-2">Connect to GitHub</h1>
          <p className="text-lg text-white/90">Manage your repositories and branches with ease</p>
        </motion.div>
      </div>

      {/* Main Content */}
      <main className="flex-1 container max-w-2xl -mt-20">
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
        >
          <Card className="shadow-xl border-0 bg-background/80 backdrop-blur-sm">
            <CardHeader>
              <motion.div variants={item}>
                <CardTitle className="text-2xl">GitHub Access</CardTitle>
                <CardDescription className="text-base">
                  Please enter your GitHub Personal Access Token and select the profile type.
                  This information will be stored locally in your browser.
                </CardDescription>
              </motion.div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <motion.div variants={item} className="space-y-2">
                  <Label htmlFor="token" className="text-base flex items-center gap-2">
                    <Key className="w-4 h-4" />
                    GitHub Token
                  </Label>
                  <div className="relative">
                    <Input
                      id="token"
                      type={showToken ? "text" : "password"}
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                      className="pr-10"
                      placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-1/2 -translate-y-1/2 hover:bg-transparent"
                      onClick={() => setShowToken(!showToken)}
                    >
                      {showToken ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </motion.div>

                <motion.div variants={item} className="space-y-4">
                  <Label className="text-base flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Profile Type
                  </Label>
                  <RadioGroup
                    defaultValue="user"
                    value={profileType}
                    onValueChange={setProfileType}
                    className="grid grid-cols-2 gap-4"
                  >
                    <Label
                      htmlFor="user"
                      className={cn(
                        "flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer",
                        profileType === "user" && "border-primary"
                      )}
                    >
                      <RadioGroupItem value="user" id="user" className="sr-only" />
                      <User className="mb-2 h-6 w-6" />
                      <span className="text-sm font-medium">User</span>
                    </Label>
                    <Label
                      htmlFor="organization"
                      className={cn(
                        "flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer",
                        profileType === "organization" && "border-primary"
                      )}
                    >
                      <RadioGroupItem value="organization" id="organization" className="sr-only" />
                      <Building2 className="mb-2 h-6 w-6" />
                      <span className="text-sm font-medium">Organization</span>
                    </Label>
                  </RadioGroup>
                </motion.div>

                <motion.div variants={item}>
                  <Button type="submit" className="w-full" size="lg">
                    Connect
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </motion.div>
              </form>
            </CardContent>
            <CardFooter className="text-sm text-muted-foreground">
              <motion.p variants={item} className="text-center w-full">
                Your credentials are stored locally and are never sent to any external servers.
              </motion.p>
            </CardFooter>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}; 