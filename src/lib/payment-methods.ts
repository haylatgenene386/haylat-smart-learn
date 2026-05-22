export type PaymentMethodKey = "telebirr" | "cbe_birr" | "cbe_account";

export interface PaymentMethod {
  key: PaymentMethodKey;
  label: string;
  accountLabel: string;
  accountNumber: string;
  holderName: string;
  instructions: string;
}

export const PAYMENT_METHODS: PaymentMethod[] = [
  {
    key: "telebirr",
    label: "Telebirr",
    accountLabel: "Phone Number",
    accountNumber: "+251 911 000 000",
    holderName: "Haylat EdTech",
    instructions:
      "Open your Telebirr app, choose 'Send Money', enter the phone number above, then upload the success screenshot or paste the transaction reference below.",
  },
  {
    key: "cbe_birr",
    label: "CBE Birr",
    accountLabel: "Phone Number",
    accountNumber: "+251 922 000 000",
    holderName: "Haylat EdTech",
    instructions:
      "Dial *847# or open the CBE Birr app, send the registration fee to the phone number above, then upload the SMS confirmation or paste the reference number.",
  },
  {
    key: "cbe_account",
    label: "Commercial Bank of Ethiopia (Account Transfer)",
    accountLabel: "Account Number",
    accountNumber: "1000 1234 5678 90",
    holderName: "Haylat EdTech PLC",
    instructions:
      "Transfer the registration fee to the CBE account number above using the CBE Mobile app, ATM, or any branch. Upload the slip / screenshot or paste the VAT invoice number.",
  },
];

export const getPaymentMethod = (key: string | null | undefined) =>
  PAYMENT_METHODS.find((m) => m.key === key);
