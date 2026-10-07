import { paymentApi, type RazorpayOrderResponse } from "../api/client";

export interface RazorpaySuccessResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export interface RazorpayFailureResponse {
  error: {
    code: string;
    description: string;
    source: string;
    step: string;
    reason: string;
    metadata: {
      order_id: string;
      payment_id?: string;
    };
  };
}

/**
 * Dynamically ensure Razorpay checkout.js is loaded
 */
export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window !== "undefined" && (window as any).Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

/**
 * Launch Razorpay Checkout Modal (Test Mode)
 */
export async function openRazorpayCheckout({
  razorpayOrder,
  keyId,
  customer,
  onSuccess,
  onError,
  onDismiss,
}: {
  razorpayOrder: RazorpayOrderResponse;
  keyId: string;
  customer: {
    name: string;
    email?: string;
    mobile?: string;
  };
  onSuccess: (response: RazorpaySuccessResponse) => Promise<void> | void;
  onError: (error: { message: string; code?: string }) => void;
  onDismiss: () => void;
}) {
  const isLoaded = await loadRazorpayScript();
  if (!isLoaded || !(window as any).Razorpay) {
    onError({ message: "Failed to load Razorpay payment gateway. Please check your internet connection." });
    return;
  }

  const options = {
    key: keyId,
    amount: razorpayOrder.amount, // in paise
    currency: razorpayOrder.currency || "INR",
    name: "FORMA Luxury",
    description: `Order #${razorpayOrder.receipt || razorpayOrder.id}`,
    image: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=128&q=80",
    order_id: razorpayOrder.id,
    prefill: {
      name: customer.name || "Customer",
      email: customer.email || "",
      contact: customer.mobile ? customer.mobile.replace("+91", "") : "",
    },
    theme: {
      color: "#0a0a0a",
      backdrop_color: "rgba(0, 0, 0, 0.75)",
    },
    modal: {
      confirm_close: true,
      ondismiss: function () {
        console.log("ℹ️ [RAZORPAY] Checkout modal closed by user.");
        onDismiss();
      },
    },
    handler: function (response: RazorpaySuccessResponse) {
      console.log("✅ [RAZORPAY] Payment authorization received from gateway:", response.razorpay_payment_id);
      onSuccess(response);
    },
  };

  try {
    const rzp = new (window as any).Razorpay(options);

    rzp.on("payment.failed", function (response: RazorpayFailureResponse) {
      console.error("❌ [RAZORPAY] Payment failed:", response.error);
      paymentApi.recordFailure({
        razorpay_order_id: razorpayOrder.id,
        reason: response.error?.description || "Payment failed at gateway",
      });
      onError({
        message: response.error?.description || "Payment failed. Please try a different card or UPI method.",
        code: response.error?.code,
      });
    });

    rzp.open();
  } catch (err: any) {
    console.error("Failed to initialize Razorpay checkout instance:", err);
    onError({ message: err.message || "Failed to launch Razorpay checkout." });
  }
}
