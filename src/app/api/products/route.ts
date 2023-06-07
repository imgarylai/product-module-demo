// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { kv } from "@vercel/kv";
import { initialize as ProductModuleInitialize } from "@medusajs/product";
import { ProductTypes } from "@medusajs/types";
import { NextRequest, NextResponse } from "next/server";
import { formatContinent, isoAlpha2Countries } from "@/lib/utils";
import { UserData } from "@/types";

declare global {
  var productService: ProductTypes.IProductService;
}

type Data = {
  categoryId?: string;
  categoryName?: string;
  continent: string;
  continentText: { article: string; name: string };
  country: string;
};

export async function GET(req: NextRequest) {
  // If already instaciated, it will return the instance or create a new one
  const productService = await ProductModuleInitialize();

  let now = 0, end = 0

  now = performance.now()
  const { categoryId, categoryName, continent, continentText, country } =
    await getData(req);
  end = performance.now()
  console.log(`getData took ${end - now} milliseconds.`)

  now = performance.now()
  let [personalizedProducts, allProducts] = await queryProducts({
    continent,
  });
  end = performance.now()
  console.log(`queryProducts took ${end - now} milliseconds.`)

  now = performance.now()
  const data = orderProductByCategoryIdFirst({
    products: allProducts,
    personalizedProducts,
    recentlyVisitedCategoryId: categoryId,
  });
  end = performance.now()
  console.log(`orderProductByCategoryIdFirst took ${end - now} milliseconds.`)

  return NextResponse.json({
    personalized_section: {
      country,
      continent_text: continentText,
      products: data.personalizedProducts,
    },
    all_products_section: {
      category_name: categoryName,
      products: data.allProducts,
    },
  }, {
    headers: {
      "Cache-control": "max-age=604800, must-revalidate"
    }
  })
}

async function getData(req: NextRequest): Promise<Data> {
  const userId = req.cookies.get("userId")?.value;
  let categoryId, categoryName;

  if (userId) {
    const userData = ((await kv.get(userId)) ?? {}) as UserData;

    categoryId = userData.categoryId;
    categoryName = userData.categoryName;
  }

  const countryCode: string =
    req.headers.get("x-simulated-country") ??
    req.headers.get("x-vercel-ip-country") ??
    "US";

  let { name: country, continent } = isoAlpha2Countries[countryCode];
  const continentText = formatContinent(continent);

  return {
    country,
    categoryId,
    categoryName,
    continent,
    continentText,
  };
}

async function queryProducts({
  continent,
}: {
  continent: string;
}): Promise<[ProductTypes.ProductDTO[], ProductTypes.ProductDTO[]]> {
  const productService = await ProductModuleInitialize();

  return await Promise.all([
    productService.list(
      {
        tags: { value: [continent] },
      },
      {
        select: ["id"],
        take: 3,
      }
    ),
    productService.list(
      {},
      {
        relations: ["variants", "categories", "tags"],
        order: { id: "DESC" },
        take: 100,
      }
    ),
  ]);
}

function orderProductByCategoryIdFirst({
  products,
  personalizedProducts,
  recentlyVisitedCategoryId,
}: {
  products: ProductTypes.ProductDTO[];
  personalizedProducts: ProductTypes.ProductDTO[];
  recentlyVisitedCategoryId?: string;
}) {
  const productMap = new Map<string, ProductTypes.ProductDTO>();
  const categoryProductsMap = new Map<string, ProductTypes.ProductDTO[]>();

  for (const product of products) {
    const category = product.categories?.[0];
    if (!categoryProductsMap.has(category?.id!)) {
      categoryProductsMap.set(category?.id!, []);
    }

    categoryProductsMap.get(category?.id!)!.push(product);
    productMap.set(product.id, product);
  }

  let recentlyViewedProducts: ProductTypes.ProductDTO[] = [];
  if (recentlyVisitedCategoryId) {
    recentlyViewedProducts = categoryProductsMap.get(
      recentlyVisitedCategoryId
    )!;
    categoryProductsMap.delete(recentlyVisitedCategoryId);
  }

  const allProducts = Array.from(recentlyViewedProducts.values()).concat(
    Array.from(categoryProductsMap.values()).flat()
  );

  // Assign the products data to the light personalized products
  personalizedProducts = personalizedProducts.map(
    (p: ProductTypes.ProductDTO) => {
      return productMap.get(p.id)!;
    }
  );

  return { personalizedProducts, allProducts };
}
