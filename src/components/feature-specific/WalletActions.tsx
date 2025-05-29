
"use client";

import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { PlusCircle } from "lucide-react";
import React from 'react';

export function WalletActions() {
  const { toast } = useToast();

  const handleAddCredits = () => {
    toast({
      title: "Credits Added (Mock)",
      description: "100 credits have been added to your wallet.",
    });
  };

  return (
    <Button onClick={handleAddCredits} className="w-full sm:w-auto">
      <PlusCircle className="mr-2 h-5 w-5" />
      Add Credits (Mock)
    </Button>
  );
}
