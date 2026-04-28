import { Suspense } from "react";

import { AuthForm } from "../AuthForm";

export default function SignUpPage() {
  return (
    <Suspense fallback={null}>
      <AuthForm mode="sign-up" />
    </Suspense>
  );
}
