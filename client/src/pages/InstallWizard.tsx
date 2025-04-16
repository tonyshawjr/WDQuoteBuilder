import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useToast } from "@/hooks/use-toast";
import { getQueryFn, apiRequest } from "@/lib/queryClient";
import { useLocation } from 'wouter';

// Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Steps } from '@/components/ui/steps';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Database, Server, User, CheckCircle, Settings } from "lucide-react";

// Type for database connection settings
interface DatabaseConfig {
  type: 'postgres' | 'mysql';
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl: boolean;
}

// Type for admin user settings
interface AdminUser {
  username: string;
  password: string;
  email: string;
  firstName: string;
  lastName: string;
}

// Type for installation settings
interface InstallationSettings {
  databaseConfig: DatabaseConfig;
  adminUser: AdminUser;
  businessName: string;
  includeDemoData: boolean;
}

// Steps in the installation process
const STEPS = [
  { id: 'welcome', label: 'Welcome' },
  { id: 'database', label: 'Database Setup' },
  { id: 'admin', label: 'Admin Account' },
  { id: 'business', label: 'Business Info' },
  { id: 'complete', label: 'Complete' }
];

// Default installation settings
const DEFAULT_SETTINGS: InstallationSettings = {
  databaseConfig: {
    type: 'mysql',  // Default to MySQL since we're targeting cPanel hosting
    host: 'localhost',
    port: 3306,
    database: 'web_design_calculator',
    user: 'root',
    password: '',
    ssl: false
  },
  adminUser: {
    username: '',
    password: '',
    email: '',
    firstName: '',
    lastName: ''
  },
  businessName: '',
  includeDemoData: true
};

const InstallWizard: React.FC = () => {
  // Navigation hooks
  const [, setLocation] = useLocation();
  
  // Toast notification
  const { toast } = useToast();
  
  // State for tracking the current step and installation settings
  const [currentStep, setCurrentStep] = useState<string>('welcome');
  const [settings, setSettings] = useState<InstallationSettings>(DEFAULT_SETTINGS);
  const [testConnectionStatus, setTestConnectionStatus] = useState<{status: 'idle' | 'loading' | 'success' | 'error', message?: string}>({
    status: 'idle'
  });
  
  // Query to check if the app is already installed
  const { data: installStatus, isLoading: installStatusLoading } = useQuery({
    queryKey: ['/api/install/status'],
    queryFn: getQueryFn(),
    retry: false
  });

  // Redirect to home if already installed
  useEffect(() => {
    if (installStatus?.isInstalled) {
      setLocation('/');
      toast({
        title: "Already Installed",
        description: "The application is already installed. Redirecting to the home page.",
        variant: "default"
      });
    }
  }, [installStatus, setLocation, toast]);

  // Mutation for testing database connection
  const testConnectionMutation = useMutation({
    mutationFn: async (dbConfig: DatabaseConfig) => {
      const res = await apiRequest('POST', '/api/install/test-connection', dbConfig);
      return await res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        setTestConnectionStatus({
          status: 'success',
          message: 'Connection successful! You can proceed to the next step.'
        });
      } else {
        setTestConnectionStatus({
          status: 'error',
          message: data.message || 'Connection failed. Please check your settings.'
        });
      }
    },
    onError: (error: Error) => {
      setTestConnectionStatus({
        status: 'error',
        message: `Connection failed: ${error.message}`
      });
    }
  });

  // Mutation for installing the application
  const installMutation = useMutation({
    mutationFn: async (installSettings: InstallationSettings) => {
      const res = await apiRequest('POST', '/api/install/install', installSettings);
      return await res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        setCurrentStep('complete');
        toast({
          title: "Installation Successful",
          description: "The application has been successfully installed.",
          variant: "default"
        });
      } else {
        toast({
          title: "Installation Failed",
          description: data.message || 'An error occurred during installation.',
          variant: "destructive"
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Installation Error",
        description: `An error occurred: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  // Handler for testing the database connection
  const handleTestConnection = () => {
    setTestConnectionStatus({ status: 'loading' });
    testConnectionMutation.mutate(settings.databaseConfig);
  };

  // Handler for completing the installation
  const handleInstall = () => {
    installMutation.mutate(settings);
  };

  // Handler for navigating to the next step
  const handleNext = () => {
    // Validate the current step
    if (currentStep === 'database') {
      // Validate database settings
      const { host, port, database, user } = settings.databaseConfig;
      if (!host || !port || !database || !user) {
        toast({
          title: "Missing Database Settings",
          description: "Please fill in all required database fields.",
          variant: "destructive"
        });
        return;
      }
    } else if (currentStep === 'admin') {
      // Validate admin user settings
      const { username, password, email } = settings.adminUser;
      if (!username || !password || !email) {
        toast({
          title: "Missing Admin User Settings",
          description: "Please fill in all required admin user fields.",
          variant: "destructive"
        });
        return;
      }
    } else if (currentStep === 'business') {
      // Validate business settings
      if (!settings.businessName) {
        toast({
          title: "Missing Business Name",
          description: "Please enter your business name.",
          variant: "destructive"
        });
        return;
      }
      
      // Start the installation
      handleInstall();
      return;
    }
    
    // Get the current step index
    const currentStepIndex = STEPS.findIndex(step => step.id === currentStep);
    if (currentStepIndex < STEPS.length - 1) {
      // Move to the next step
      setCurrentStep(STEPS[currentStepIndex + 1].id);
    }
  };

  // Handler for navigating to the previous step
  const handleBack = () => {
    // Get the current step index
    const currentStepIndex = STEPS.findIndex(step => step.id === currentStep);
    if (currentStepIndex > 0) {
      // Move to the previous step
      setCurrentStep(STEPS[currentStepIndex - 1].id);
    }
  };

  // Handler for updating database settings
  const handleDatabaseChange = (field: keyof DatabaseConfig, value: any) => {
    setSettings({
      ...settings,
      databaseConfig: {
        ...settings.databaseConfig,
        [field]: value
      }
    });
  };

  // Handler for updating admin user settings
  const handleAdminUserChange = (field: keyof AdminUser, value: string) => {
    setSettings({
      ...settings,
      adminUser: {
        ...settings.adminUser,
        [field]: value
      }
    });
  };

  // If checking installation status, show loading
  if (installStatusLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Checking installation status...</span>
      </div>
    );
  }

  return (
    <div className="container min-h-screen py-10 bg-background">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold mb-2">Web Design Price Calculator Setup</h1>
          <p className="text-muted-foreground">Follow the steps below to install and configure your application</p>
        </div>
        
        {/* Step indicator */}
        <Steps 
          steps={STEPS} 
          activeStep={currentStep} 
          className="mb-6" 
        />
        
        <Card className="w-full">
          {/* Welcome Step */}
          {currentStep === 'welcome' && (
            <>
              <CardHeader>
                <CardTitle>Welcome to the Installation Wizard</CardTitle>
                <CardDescription>
                  This wizard will guide you through setting up your Web Design Price Calculator application.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border p-4">
                  <h3 className="text-lg font-semibold mb-2">Before You Begin</h3>
                  <p className="mb-2">Please ensure you have the following information ready:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Database connection details (host, username, password)</li>
                    <li>Admin user details for your first administrator account</li>
                    <li>Your business name and basic information</li>
                  </ul>
                </div>
                <div className="rounded-lg border p-4">
                  <h3 className="text-lg font-semibold mb-2">System Requirements</h3>
                  <p className="mb-2">Your hosting environment should support:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Node.js (v14+)</li>
                    <li>MySQL or PostgreSQL database</li>
                    <li>The ability to create and configure database tables</li>
                  </ul>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end">
                <Button onClick={handleNext}>Next: Database Setup</Button>
              </CardFooter>
            </>
          )}
          
          {/* Database Setup Step */}
          {currentStep === 'database' && (
            <>
              <CardHeader>
                <CardTitle>Database Configuration</CardTitle>
                <CardDescription>
                  Configure your database connection settings.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <Database className="h-6 w-6 text-muted-foreground" />
                  <div>
                    <h3 className="font-medium">Database Type</h3>
                    <p className="text-sm text-muted-foreground">
                      Select your database system. MySQL is recommended for cPanel hosting.
                    </p>
                  </div>
                </div>
                <Tabs 
                  defaultValue={settings.databaseConfig.type}
                  onValueChange={(value) => handleDatabaseChange('type', value as 'mysql' | 'postgres')}
                  className="w-full"
                >
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="mysql">MySQL</TabsTrigger>
                    <TabsTrigger value="postgres">PostgreSQL</TabsTrigger>
                  </TabsList>
                  <TabsContent value="mysql" className="border rounded-md p-4 mt-2">
                    <p className="text-sm text-muted-foreground mb-4">
                      MySQL is widely supported on most hosting platforms including cPanel.
                    </p>
                  </TabsContent>
                  <TabsContent value="postgres" className="border rounded-md p-4 mt-2">
                    <p className="text-sm text-muted-foreground mb-4">
                      PostgreSQL offers more advanced features but may not be available on all hosting services.
                    </p>
                  </TabsContent>
                </Tabs>
                
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="host" className="text-right">
                      Host
                    </Label>
                    <Input
                      id="host"
                      placeholder="localhost"
                      value={settings.databaseConfig.host}
                      onChange={(e) => handleDatabaseChange('host', e.target.value)}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="port" className="text-right">
                      Port
                    </Label>
                    <Input
                      id="port"
                      type="number"
                      placeholder={settings.databaseConfig.type === 'mysql' ? '3306' : '5432'}
                      value={settings.databaseConfig.port}
                      onChange={(e) => handleDatabaseChange('port', parseInt(e.target.value))}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="database" className="text-right">
                      Database
                    </Label>
                    <Input
                      id="database"
                      placeholder="web_design_calculator"
                      value={settings.databaseConfig.database}
                      onChange={(e) => handleDatabaseChange('database', e.target.value)}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="user" className="text-right">
                      Username
                    </Label>
                    <Input
                      id="user"
                      placeholder="database_user"
                      value={settings.databaseConfig.user}
                      onChange={(e) => handleDatabaseChange('user', e.target.value)}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="password" className="text-right">
                      Password
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={settings.databaseConfig.password}
                      onChange={(e) => handleDatabaseChange('password', e.target.value)}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <div className="text-right">
                      <Label htmlFor="ssl">SSL</Label>
                    </div>
                    <div className="flex items-center space-x-2 col-span-3">
                      <Checkbox
                        id="ssl"
                        checked={settings.databaseConfig.ssl}
                        onCheckedChange={(checked) => 
                          handleDatabaseChange('ssl', Boolean(checked))
                        }
                      />
                      <label
                        htmlFor="ssl"
                        className="text-sm font-medium leading-none cursor-pointer"
                      >
                        Use SSL connection
                      </label>
                    </div>
                  </div>
                </div>
                
                {/* Test connection button and status */}
                <div className="mt-4">
                  <Button
                    variant="outline"
                    onClick={handleTestConnection}
                    disabled={testConnectionStatus.status === 'loading'}
                    className="w-full"
                  >
                    {testConnectionStatus.status === 'loading' && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Test Connection
                  </Button>
                  
                  {testConnectionStatus.status === 'success' && (
                    <Alert className="mt-2 bg-green-50 border-green-200">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertTitle className="text-green-600">Success</AlertTitle>
                      <AlertDescription className="text-green-700">
                        {testConnectionStatus.message}
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {testConnectionStatus.status === 'error' && (
                    <Alert className="mt-2 bg-red-50 border-red-200" variant="destructive">
                      <AlertTitle>Connection Failed</AlertTitle>
                      <AlertDescription>
                        {testConnectionStatus.message}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" onClick={handleBack}>Back</Button>
                <Button onClick={handleNext}>Next: Admin Account</Button>
              </CardFooter>
            </>
          )}
          
          {/* Admin Account Step */}
          {currentStep === 'admin' && (
            <>
              <CardHeader>
                <CardTitle>Admin Account Setup</CardTitle>
                <CardDescription>
                  Create an administrator account for managing the application.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <User className="h-6 w-6 text-muted-foreground" />
                  <div>
                    <h3 className="font-medium">Administrator Details</h3>
                    <p className="text-sm text-muted-foreground">
                      This account will have full access to manage your pricing calculator.
                    </p>
                  </div>
                </div>
                
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="username" className="text-right">
                      Username
                    </Label>
                    <Input
                      id="username"
                      placeholder="admin"
                      value={settings.adminUser.username}
                      onChange={(e) => handleAdminUserChange('username', e.target.value)}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="admin-password" className="text-right">
                      Password
                    </Label>
                    <Input
                      id="admin-password"
                      type="password"
                      placeholder="••••••••"
                      value={settings.adminUser.password}
                      onChange={(e) => handleAdminUserChange('password', e.target.value)}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="email" className="text-right">
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="admin@example.com"
                      value={settings.adminUser.email}
                      onChange={(e) => handleAdminUserChange('email', e.target.value)}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="first-name" className="text-right">
                      First Name
                    </Label>
                    <Input
                      id="first-name"
                      placeholder="John"
                      value={settings.adminUser.firstName}
                      onChange={(e) => handleAdminUserChange('firstName', e.target.value)}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="last-name" className="text-right">
                      Last Name
                    </Label>
                    <Input
                      id="last-name"
                      placeholder="Doe"
                      value={settings.adminUser.lastName}
                      onChange={(e) => handleAdminUserChange('lastName', e.target.value)}
                      className="col-span-3"
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" onClick={handleBack}>Back</Button>
                <Button onClick={handleNext}>Next: Business Info</Button>
              </CardFooter>
            </>
          )}
          
          {/* Business Info Step */}
          {currentStep === 'business' && (
            <>
              <CardHeader>
                <CardTitle>Business Information</CardTitle>
                <CardDescription>
                  Enter your business details and finalize the installation.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <Settings className="h-6 w-6 text-muted-foreground" />
                  <div>
                    <h3 className="font-medium">Business Setup</h3>
                    <p className="text-sm text-muted-foreground">
                      These settings will be displayed throughout your pricing calculator application.
                    </p>
                  </div>
                </div>
                
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="business-name" className="text-right">
                      Business Name
                    </Label>
                    <Input
                      id="business-name"
                      placeholder="Your Web Design Company"
                      value={settings.businessName}
                      onChange={(e) => setSettings({...settings, businessName: e.target.value})}
                      className="col-span-3"
                    />
                  </div>
                  
                  <div className="grid grid-cols-4 items-center gap-4">
                    <div className="text-right">
                      <Label htmlFor="demo-data">Demo Data</Label>
                    </div>
                    <div className="flex items-center space-x-2 col-span-3">
                      <Checkbox
                        id="demo-data"
                        checked={settings.includeDemoData}
                        onCheckedChange={(checked) => 
                          setSettings({...settings, includeDemoData: Boolean(checked)})
                        }
                      />
                      <label
                        htmlFor="demo-data"
                        className="text-sm font-medium leading-none cursor-pointer"
                      >
                        Include sample project types, features and pages
                      </label>
                    </div>
                  </div>
                </div>
                
                {installMutation.isPending && (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
                    <span>Installing, please wait...</span>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" onClick={handleBack} disabled={installMutation.isPending}>Back</Button>
                <Button onClick={handleNext} disabled={installMutation.isPending}>Install Now</Button>
              </CardFooter>
            </>
          )}
          
          {/* Complete Step */}
          {currentStep === 'complete' && (
            <>
              <CardHeader className="text-center">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
                <CardTitle>Installation Complete!</CardTitle>
                <CardDescription>
                  Your Web Design Price Calculator has been successfully installed.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-center">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-green-800">
                    You can now log in with the admin credentials you provided during setup.
                  </p>
                </div>
                
                <div className="py-2">
                  <p className="mb-2">What's next?</p>
                  <ul className="list-disc text-left pl-8">
                    <li>Log in with your admin account</li>
                    <li>Customize your project types, features and pages</li>
                    <li>Add additional team members</li>
                    <li>Start creating price quotes for your clients</li>
                  </ul>
                </div>
              </CardContent>
              <CardFooter className="flex justify-center">
                <Button onClick={() => setLocation('/')}>Go to Login</Button>
              </CardFooter>
            </>
          )}
        </Card>
      </div>
    </div>
  );
};

export default InstallWizard;