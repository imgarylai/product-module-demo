import { client } from "@/lib";
import { cookies } from "next/headers";
import CartButton from "./CartButton";

async function createCart() {
  const region = await client.regions.list().then((res) => res.regions[0]);

  const res = await client.carts.create({ region_id: region.id ?? undefined });
  const cart = res.cart;

  if (!cart) {
    throw new Error(`Cart not created`);
  }

  return cart;
}

async function getCart(cartId: string) {
  const res = await client.carts.retrieve(cartId);
  const cart = res.cart;

  if (!cart) {
    throw new Error(`Cart with id ${cartId} not found`);
  }

  return cart;
}

export default async function Cart() {
  const cartId = cookies().get("cartId")?.value;
  let cartIdUpdated = false;
  let cart;

  if (cartId) {
    cart = await getCart(cartId);
  }

  // If the `cartId` from the cookie is not set or the cart is empty
  // (old carts becomes `null` when you checkout), then get a new `cartId`
  //  and re-fetch the cart.
  if (!cartId || !cart) {
    cart = await createCart();
    cartIdUpdated = true;
  }

  return <CartButton cart={cart} cartIdUpdated={cartIdUpdated} />;
}
