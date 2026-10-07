import { FormEvent, useState } from "react";
import AdminLayout from "./AdminLayout";

export default function AdminSettingsPage() {
  const [saved, setSaved] = useState(false);

  const saveSettings = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1500);
  };

  return (
    <AdminLayout title="Settings" eyebrow="Store / Configuration">
      <form className="admin-settings-form" onSubmit={saveSettings}>
        <label>
          Store name
          <input defaultValue="Forma Studio" />
        </label>
        <label>
          Support email
          <input type="email" defaultValue="studio@forma.example" />
        </label>
        <label>
          Currency
          <select defaultValue="INR">
            <option value="INR">Indian Rupee (INR)</option>
          </select>
        </label>
        <label className="admin-setting-toggle">
          <input type="checkbox" defaultChecked />
          <span>Show low-stock warnings</span>
        </label>
        <button type="submit">{saved ? "Settings saved" : "Save settings"}</button>
      </form>
    </AdminLayout>
  );
}
