export async function getMyProfile(email: string) {
  const res = await fetch(`http://localhost:5000/api/users/me?email=${email}`);
  return res.json();
}
