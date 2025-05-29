
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard } from "lucide-react";
import { WalletActions } from "@/components/feature-specific/WalletActions";

export default function WalletPage() {
  // Mock wallet data
  const walletBalance = 250; // Example credits

  return (
    <div className="max-w-md mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-7 w-7 text-primary" />
            My Wallet
          </CardTitle>
          <CardDescription>
            View your available credits and manage your wallet for gift deliveries.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Current Balance</p>
            <p className="text-5xl font-bold text-primary">{walletBalance} <span className="text-2xl">Credits</span></p>
          </div>
          
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-2">Manage Credits</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Add credits to your wallet to ensure seamless automated gift deliveries during your cycle.
            </p>
            <WalletActions />
          </div>

          {/* Future: Transaction History */}
          {/* 
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-2">Transaction History</h3>
            <p className="text-sm text-muted-foreground">No transactions yet.</p>
          </div>
          */}
        </CardContent>
      </Card>
    </div>
  );
}
