import { useState } from "react";
import {
  Phone,
  Plus,
  Trash2,
  ShieldAlert,
} from "lucide-react";

interface Contact {
  id: number;
  name: string;
  phone: string;
}

export default function EmergencyContacts() {
  const [contacts, setContacts] = useState<Contact[]>([
    {
      id: 1,
      name: "Father",
      phone: "9876543210",
    },
  ]);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const addContact = () => {
    if (!name || !phone) return;

    setContacts([
      ...contacts,
      {
        id: Date.now(),
        name,
        phone,
      },
    ]);

    setName("");
    setPhone("");
  };

  const deleteContact = (id: number) => {
    setContacts(
      contacts.filter((c) => c.id !== id)
    );
  };

  return (
    <div className="min-h-screen bg-slate-50">

      <div className="bg-red-600 text-white p-6">
        <div className="flex items-center gap-3">
          <ShieldAlert size={34} />
          <div>
            <h1 className="text-2xl font-bold">
              Emergency Contacts
            </h1>
            <p className="text-red-100">
              People who will be notified during an SOS.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-xl mx-auto p-6">

        <div className="bg-white rounded-3xl shadow p-6 space-y-4">

          <input
            placeholder="Contact Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border rounded-xl p-3"
          />

          <input
            placeholder="Phone Number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full border rounded-xl p-3"
          />

          <button
            onClick={addContact}
            className="w-full bg-blue-600 text-white rounded-xl py-3 flex justify-center items-center gap-2"
          >
            <Plus size={18} />
            Add Contact
          </button>

        </div>

        <div className="mt-6 space-y-4">

          {contacts.map((contact) => (
            <div
              key={contact.id}
              className="bg-white rounded-2xl p-5 shadow flex justify-between items-center"
            >
              <div>
                <h2 className="font-bold">
                  {contact.name}
                </h2>

                <div className="flex items-center gap-2 text-gray-500 mt-1">
                  <Phone size={16} />
                  {contact.phone}
                </div>
              </div>

              <button
                onClick={() => deleteContact(contact.id)}
                className="text-red-600"
              >
                <Trash2 />
              </button>
            </div>
          ))}

        </div>
      </div>
    </div>
  );
}