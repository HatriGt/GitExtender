import { Dashboard } from "@/components/Dashboard";
import { useRepository } from "@/contexts/RepositoryContext";
import { Navigate, useParams } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { motion } from "framer-motion";
import { useTheme } from "@/contexts/ThemeContext";

const RepositoryPage = () => {
  const { username, repoName } = useParams();
  const { repository } = useRepository();
  const { theme } = useTheme();

  // If no repository is connected, redirect to home
  if (!repository?.isConnected) {
    return <Navigate to="/" replace />;
  }

  // If the current repository doesn't match the URL params, redirect to home
  if (repository.owner !== username || repository.name !== repoName) {
    return <Navigate to="/" replace />;
  }

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
};

export default RepositoryPage; 