// src/lib/demo-account.ts
export const DEMO_ACCOUNT_EMAIL = "skinner.chris@gmail.com";
export const DEMO_FACILITY_ID = 1;

export const isDemoAccount = (email: string | undefined): boolean => {
  return email === DEMO_ACCOUNT_EMAIL;
};

export const getDemoDataFilter = (email: string | undefined) => {
  if (isDemoAccount(email)) {
    return {
      facility_id: DEMO_FACILITY_ID,
      demo_mode: true,
    };
  }

  return {
    facility_id: null, // Will need to get from user profile
    demo_mode: false,
  };
};
