"use client";

import Image from "next/image";
import Link from "next/link";
import LogoutButton from "~/components/logout";
import { useAppContext } from "~/context/app";

const navItems = [
  { title: "🏠 Home", href: "" },
  { title: "🛒 Checkout", href: "checkout" },
  { title: "💸 Payment", href: "payment" },
  { title: "🧑🏿‍🤝‍🧑🏻 Customers", href: "customers" },
  { title: "🔄 Subscriptions", href: "subscriptions" },
];

const Header = () => {
  const { user } = useAppContext();
  return (
    <nav>
      <ul className="flex items-center bg-zinc-300 p-6">
        {navItems.map((item) => (
          <li key={item.href} className="grow text-gray-900">
            <Link href={`/app/${item.href}`}>{item.title}</Link>
          </li>
        ))}
        <li className="flex shrink-0 gap-2">
          {user.picture && (
            <Image
              width={40}
              height={40}
              src={user.picture}
              alt="user image"
              className="size-10 shrink-0 rounded-full"
            />
          )}
          <LogoutButton />
        </li>
      </ul>
    </nav>
  );
};

export default Header;
