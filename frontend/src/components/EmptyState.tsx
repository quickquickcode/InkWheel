export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="emptyInk">
      <span>空</span>
      <strong className="font-bungee">{title}</strong>
      <p>{body}</p>
    </div>
  );
}
