
import { useRepository } from "@/contexts/RepositoryContext";
import { Button } from "@/components/ui/button";
import { GitBranchPlus, RefreshCw, LogOut } from "lucide-react";
import { motion } from "framer-motion";
import { ThemeSwitcher } from "./ThemeSwitcher";

export const Navbar = () => {
  const { repository, disconnectRepository, fetchBranches, loading } = useRepository();

  return (
    <motion.header 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-lg shadow-sm"
    >
      <div className="container flex h-16 items-center justify-between">
        <motion.div 
          className="flex items-center gap-2"
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.4 }}
        >
          <motion.div
            whileHover={{ rotate: 360 }}
            transition={{ duration: 0.6 }}
          >
            <GitBranchPlus className="h-6 w-6 text-gitextender-primary" />
          </motion.div>
          <h1 className="text-xl font-bold tracking-tight">
            <span className="text-gitextender-primary">Git</span>
            <span className="relative">
              Extender
              <motion.span
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
                transition={{ delay: 0.5, duration: 0.5 }}
                className="absolute bottom-0 left-0 h-[2px] bg-gradient-to-r from-gitextender-primary to-transparent"
              />
            </span>
          </h1>
        </motion.div>

        <motion.div 
          className="flex items-center gap-3"
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          {repository?.isConnected && (
            <>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => fetchBranches()}
                disabled={loading}
                className="transition-all duration-200 shadow-sm hover:shadow-md hover:bg-muted/60"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              
              <Button 
                variant="ghost" 
                size="sm"
                onClick={disconnectRepository}
                className="transition-all duration-200 text-muted-foreground hover:text-foreground"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Disconnect
              </Button>
            </>
          )}
          
          {/* Replace the old theme toggle with the new ThemeSwitcher component */}
          <ThemeSwitcher />
        </motion.div>
      </div>
    </motion.header>
  );
};
