import { Dashboard } from "@/components/Dashboard";
import { useRepository } from "@/contexts/RepositoryContext";
import { Navigate, useParams } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { motion } from "framer-motion";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { toast } from "sonner";

const RepositoryPage = () => {
  const { username, repoName } = useParams();
  const { repository, connectRepository } = useRepository();
  const { theme } = useTheme();
  const [token, setToken] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if we have a token in localStorage
    const storedToken = localStorage.getItem('github_token');
    if (storedToken) {
      setToken(storedToken);
      connectRepo(storedToken);
    } else {
      setIsLoading(false);
    }
  }, [username, repoName]);

  const connectRepo = async (tokenToUse: string) => {
    try {
      setIsLoading(true);
      await connectRepository(
        `https://github.com/${username}/${repoName}`,
        tokenToUse,
        {
          development: "Development",
          quality: "Quality",
          production: "Production"
        }
      );
    } catch (error) {
      console.error("Failed to connect repository:", error);
      toast.error("Failed to connect to repository");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTokenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) {
      toast.error("Please enter a valid token");
      return;
    }
    
    // Store token in localStorage
    localStorage.setItem('github_token', token);
    await connectRepo(token);
  };

  // If no repository is connected and we're not loading, show token input
  if (!repository?.isConnected && !isLoading) {
    return (
      <div className={`min-h-screen flex flex-col ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <Navbar />
        <main className="flex-1 container py-6">
          <div className="max-w-md mx-auto mt-20">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card p-8 rounded-lg shadow-lg"
            >
              <h2 className="text-2xl font-bold mb-4">GitHub Personal Access Token</h2>
              <p className="text-muted-foreground mb-6">
                Please enter your GitHub Personal Access Token to access the repository.
                This token will be stored locally in your browser.
              </p>
              <form onSubmit={handleTokenSubmit}>
                <div className="space-y-4">
                  <Input
                    type="password"
                    placeholder="Enter your GitHub token"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    className="w-full"
                  />
                  <Button type="submit" className="w-full">
                    Connect Repository
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        </main>
      </div>
    );
  }

  // If repository is connected, show the dashboard
  if (repository?.isConnected) {
    return (
      <div className={`min-h-screen flex flex-col ${theme === 'dark' ? 'bg-gradient-to-br from-gray-900 to-slate-800' : 'bg-gradient-to-br from-blue-50 to-indigo-100'} bg-fixed`}>
        <div className="absolute inset-0 bg-grid-pattern opacity-5 pointer-events-none"></div>
        <Navbar />
        <main className="flex-1 container py-6">
          <Dashboard />
        </main>
        <motion.footer 
          className="border-t py-6 bg-background/80 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 1.2 }}
        >
          <div className="container text-center">
            <p className="text-muted-foreground mb-2">GitExtender • Advanced Branch Management Dashboard</p>
            <div className="flex justify-center gap-4 text-sm">
              <a href="#" className="text-primary hover:underline">Documentation</a>
              <a href="#" className="text-primary hover:underline">GitHub</a>
              <a href="#" className="text-primary hover:underline">Support</a>
            </div>
          </div>
        </motion.footer>
      </div>
    );
  }

  // Show loading state
  return (
    <div className={`min-h-screen flex flex-col ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <Navbar />
      <main className="flex-1 container py-6">
        <div className="max-w-md mx-auto mt-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card p-8 rounded-lg shadow-lg text-center"
          >
            <h2 className="text-2xl font-bold mb-4">Loading Repository...</h2>
            <p className="text-muted-foreground">Please wait while we connect to the repository.</p>
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default RepositoryPage; 