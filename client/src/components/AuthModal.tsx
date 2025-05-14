import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Login form schema
const loginSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z
    .string()
    .min(6, { message: "Password must be at least 6 characters" }),
});

// Register form schema
const registerSchema = z
  .object({
    email: z.string().email({ message: "Please enter a valid email address" }),
    username: z
      .string()
      .min(3, { message: "Username must be at least 3 characters" }),
    password: z
      .string()
      .min(6, { message: "Password must be at least 6 characters" }),
    confirmPassword: z
      .string()
      .min(6, { message: "Password must be at least 6 characters" }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type LoginValues = z.infer<typeof loginSchema>;
type RegisterValues = z.infer<typeof registerSchema>;

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const { login, register: registerUser, isLoading } = useAuth();
  // Registration disabled as per requirements, but maintaining the state for potential future use
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  
  // Force login mode on component load
  useEffect(() => {
    setIsRegisterMode(false);
  }, []);

  const loginForm = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const registerForm = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      username: "",
      password: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    if (isOpen) {
      const inputs = document.querySelectorAll("input");
      inputs.forEach((input) => {
        input.style.color = "white";
        input.style.caretColor = "white";
      });
    }
  }, [isOpen, isRegisterMode]);

  const handleLogin = async (values: LoginValues) => {
    try {
      await login(values.email, values.password);
      loginForm.reset();
      onClose();
    } catch (error) {
      console.error("Login error:", error);
    }
  };

  const handleRegister = async (values: RegisterValues) => {
    try {
      await registerUser(values.email, values.username, values.password);
      registerForm.reset();
      onClose();
    } catch (error) {
      console.error("Register error:", error);
    }
  };

  const toggleMode = () => {
    setIsRegisterMode(!isRegisterMode);
    loginForm.reset();
    registerForm.reset();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      // Impedisce la chiusura del dialog quando si fa clic all'esterno
      if (!open) {
        // Non fare nulla, impedendo la chiusura
        return;
      }
    }}>
      <DialogContent className="bg-blue-950 border-blue-800 text-white sm:max-w-md shadow-lg shadow-blue-900/20">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-blue-50">
            Accedi
          </DialogTitle>
          <DialogDescription className="text-blue-300/70">
            Accedi al tuo account per ascoltare la musica
          </DialogDescription>
        </DialogHeader>

        {false && isRegisterMode ? (
          <Form {...registerForm}>
            <form
              onSubmit={registerForm.handleSubmit(handleRegister)}
              className="space-y-4"
            >
              <FormField
                control={registerForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="your@email.com"
                        className="bg-gray-800 border-gray-700 text-white caret-white"
                        autoComplete="off"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={registerForm.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="username"
                        className="bg-gray-800 border-gray-700 text-white caret-white"
                        autoComplete="off"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={registerForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Password"
                        className="bg-gray-800 border-gray-700 text-white caret-white"
                        autoComplete="new-password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={registerForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Confirm password"
                        className="bg-gray-800 border-gray-700 text-white caret-white"
                        autoComplete="new-password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full bg-[hsl(var(--albify-accent))] hover:bg-opacity-80"
                disabled={isLoading}
              >
                {isLoading ? "Creating account..." : "Sign Up"}
              </Button>
            </form>
          </Form>
        ) : (
          <Form {...loginForm}>
            <form
              onSubmit={loginForm.handleSubmit(handleLogin)}
              className="space-y-4"
            >
              <FormField
                control={loginForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="your@email.com"
                        className="bg-blue-900/50 border-blue-700 text-blue-50 caret-blue-300 focus-visible:ring-blue-500"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={loginForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Password"
                        className="bg-blue-900/50 border-blue-700 text-blue-50 caret-blue-300 focus-visible:ring-blue-500"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium shadow-sm shadow-blue-600/30"
                disabled={isLoading}
              >
                {isLoading ? "Accesso in corso..." : "Accedi"}
              </Button>
            </form>
          </Form>
        )}

        {/* Registration option hidden as per requirements */}
        <div className="mt-4 text-center">
          <p className="text-blue-300/60 text-sm italic">
            Per favore contatta un amministratore per gli accessi.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}