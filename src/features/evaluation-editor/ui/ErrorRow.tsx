export function ErrorRow({ retry }: { readonly retry: () => void }) {
  return (
    <div role="alert" className="mt-3 text-xs text-danger">
      Could not load this resource.{" "}
      <button type="button" onClick={retry} className="underline">
        Retry
      </button>
    </div>
  );
}
