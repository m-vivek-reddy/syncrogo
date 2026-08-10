import {
  User,
  Shield,
  Car,
  Circle,
} from "lucide-react";

interface Props {
  users: any[];
}

export default function UsersTable({ users }: Props) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">

      <div className="flex justify-between items-center mb-6">

        <h2 className="text-2xl font-bold">
          Platform Users
        </h2>

        <span className="text-slate-500">
          {users.length} Users
        </span>

      </div>

      <div className="overflow-x-auto">

        <table className="w-full">

          <thead>

            <tr className="border-b">

              <th className="text-left py-3">Name</th>

              <th className="text-left">Email</th>

              <th>Role</th>

              <th>Status</th>

              <th>Action</th>

            </tr>

          </thead>

          <tbody>

            {users.map((user) => (

              <tr
                key={user.id}
                className="border-b hover:bg-slate-50"
              >

                <td className="py-4">

                  <div className="flex items-center gap-3">

                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">

                      <User size={18} />

                    </div>

                    {user.name}

                  </div>

                </td>

                <td>{user.email}</td>

                <td>

                  <div className="flex justify-center">

                    {user.role === "admin" && (
                      <Shield className="text-red-500" />
                    )}

                    {user.role === "driver" && (
                      <Car className="text-green-500" />
                    )}

                    {user.role === "passenger" && (
                      <User className="text-blue-500" />
                    )}

                  </div>

                </td>

                <td>

                  {user.is_online ? (
                    <span className="text-green-600 flex justify-center items-center gap-2">
                      <Circle fill="green" size={10} />
                      Online
                    </span>
                  ) : (
                    <span className="text-gray-500">
                      Offline
                    </span>
                  )}

                </td>

                <td>

                  <button className="px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600">

                    View

                  </button>

                </td>

              </tr>

            ))}

          </tbody>

        </table>

      </div>

    </div>
  );
}