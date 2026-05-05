import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const { user, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  useEffect(() => {
    if (user) navigate({ to: "/dashboard" });
  }, [user, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) toast.error(error);
    else toast.success("خوش آمدید");
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signUp(email, password, fullName);
    setLoading(false);
    if (error) toast.error(error);
    else toast.success("اکاؤنٹ بن گیا — براہِ کرم اپنا ای میل تصدیق کریں۔");
  };

  return (
    <div className="min-h-screen marble-texture grid place-items-center p-4" dir="rtl">
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="inline-flex h-16 w-16 rounded-2xl bg-primary text-primary-foreground items-center justify-center font-urdu font-bold text-3xl gold-glow mb-4">
            م
          </div>
          <h1 className="font-urdu text-4xl text-primary">المکہ فیکٹری</h1>
          <p className="font-urdu text-sm text-muted-foreground mt-1">ماربل مینیجر — انتظامی نظام</p>
        </div>

        <Card className="p-6 gold-shadow border-primary/20 bg-card/90 backdrop-blur">
          <Tabs defaultValue="signin">
            <TabsList className="w-full grid grid-cols-2 mb-4">
              <TabsTrigger value="signin" className="font-urdu text-base">داخل ہوں</TabsTrigger>
              <TabsTrigger value="signup" className="font-urdu text-base">اکاؤنٹ بنائیں</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <Label htmlFor="si-email" className="font-urdu">ای میل</Label>
                  <Input
                    id="si-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@factory.pk"
                    dir="ltr"
                  />
                </div>
                <div>
                  <Label htmlFor="si-pass" className="font-urdu">پاس ورڈ</Label>
                  <Input
                    id="si-pass"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    dir="ltr"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-urdu text-base"
                  disabled={loading}
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  داخل ہوں
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div>
                  <Label htmlFor="su-name" className="font-urdu">پورا نام</Label>
                  <Input
                    id="su-name"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="su-email" className="font-urdu">ای میل</Label>
                  <Input
                    id="su-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    dir="ltr"
                  />
                </div>
                <div>
                  <Label htmlFor="su-pass" className="font-urdu">پاس ورڈ</Label>
                  <Input
                    id="su-pass"
                    type="password"
                    minLength={6}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    dir="ltr"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-urdu text-base"
                  disabled={loading}
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  اکاؤنٹ بنائیں
                </Button>
                <p className="font-urdu text-xs text-muted-foreground text-center">
                  پہلا اکاؤنٹ خودبخود ایڈمن بن جاتا ہے۔
                </p>
              </form>
            </TabsContent>
          </Tabs>
        </Card>
        <div className="text-center mt-6">
          <Link to="/public" className="font-urdu text-primary hover:underline">فیکٹری کے بارے میں</Link>
        </div>
      </motion.div>
    </div>
  );
}
