const API_URL = "http://localhost:5000/api/auth";

export const loginApi = async (email: string, password: string) => {
    const res = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
    });
    return res.json();
};

export const verifyOtpApi = async (email: string, otp: string) => {
    const res = await fetch(`${API_URL}/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
    });
    return res.json();
};
