type Card = {
  title: string
  url: string
}

const cards: Card[] = [
  { title: "ブログ記事のダミー", url: "https://example.com/blog/1" },
  { title: "Zenn記事のダミー", url: "https://example.com/zenn/1" },
  { title: "GitHubリポジトリのダミー", url: "https://example.com/github/1" },
]

export default async function UserPage({
  params,
}: {
  params: Promise<{ username: string }>
}) {
  const { username } = params
  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-2xl font-bold">@{username}</h1>
      <ul className="mt-6 space-y-3">
        {cards.map((card) => (
          <li key={card.url} className="rounded-lg border p-4">
            <a href={card.url}>{card.title}</a>
          </li>
        ))}
      </ul>
    </main>
  )
}