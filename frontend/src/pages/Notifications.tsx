import ProfileBackButton from "../components/profile/ProfileBackButton";

export default function Notifications() {
  return (
    <div className="p-6">
      <ProfileBackButton />
      <h1 className="text-2xl font-bold">Notifications</h1>
      <p className="text-slate-500 mt-2">
        Notification settings.
      </p>
    </div>
  );
}
