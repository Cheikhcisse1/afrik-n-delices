import { useState, type FormEvent } from "react";
import { Field, FormError, PageLoader, Spinner, TextArea } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { ApiError, api, errorMessage } from "../../lib/api";
import { price } from "../../lib/format";
import type { Category, MenuItem } from "../../lib/types";
import { useApi } from "../../lib/useApi";
import { Modal, centsToInput, parseEuros } from "./Modal";

function ItemForm({ item, categories, defaultCategory, onDone }: { item?: MenuItem; categories: Category[]; defaultCategory?: number; onDone: () => void }) {
  const toast = useToast();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const priceCents = parseEuros(String(f.get("price") ?? ""));
    if (priceCents === null) return setErrors({ priceCents: "Prix invalide (ex. : 7 ou 2,50)." });
    const payload = {
      categoryId: Number(f.get("categoryId")),
      name: String(f.get("name") ?? ""),
      description: String(f.get("description") ?? ""),
      priceCents,
      imageUrl: String(f.get("imageUrl") ?? ""),
      available: f.get("available") === "on",
      position: Number(f.get("position") || 0),
    };
    setSending(true);
    setErrors({});
    setFormError(null);
    try {
      if (item) await api(`/admin/menu-items/${item.id}`, { method: "PUT", body: payload });
      else await api("/admin/menu-items", { body: payload });
      toast(item ? "Plat modifié." : "Plat ajouté.");
      onDone();
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.details);
        setFormError(err.message);
      } else setFormError("Une erreur est survenue.");
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <FormError message={formError} />
      <div>
        <label htmlFor="f-categoryId" className="label">
          Catégorie
        </label>
        <select id="f-categoryId" name="categoryId" className="input" defaultValue={item?.categoryId ?? defaultCategory}>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <Field label="Nom" name="name" defaultValue={item?.name} error={errors.name} required />
      <div className="grid grid-cols-2 gap-4">
        <Field label="Prix (€)" name="price" inputMode="decimal" defaultValue={item ? centsToInput(item.priceCents) : ""} error={errors.priceCents} required />
        <Field label="Ordre d’affichage" name="position" type="number" min={0} defaultValue={item?.position ?? 0} error={errors.position} />
      </div>
      <TextArea label="Description (facultatif)" name="description" defaultValue={item?.description ?? ""} maxLength={300} error={errors.description} className="[&_textarea]:min-h-[80px]" />
      <Field label="Photo (lien, facultatif)" name="imageUrl" defaultValue={item?.imageUrl ?? ""} placeholder="https://… ou /images/…" error={errors.imageUrl} />
      <label className="flex items-center gap-3">
        <input type="checkbox" name="available" defaultChecked={item?.available ?? true} className="h-4 w-4 accent-piment-dark" />
        Disponible à la commande
      </label>
      <button className="btn-primary w-full" disabled={sending}>
        {sending && <Spinner />} {item ? "Enregistrer" : "Ajouter le plat"}
      </button>
    </form>
  );
}

function CategoryForm({ category, onDone }: { category?: Category; onDone: () => void }) {
  const toast = useToast();
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const payload = { name: String(f.get("name") ?? ""), position: Number(f.get("position") || 0) };
    setSending(true);
    setError(null);
    try {
      if (category) await api(`/admin/categories/${category.id}`, { method: "PUT", body: payload });
      else await api("/admin/categories", { body: payload });
      toast(category ? "Catégorie renommée." : "Catégorie créée.");
      onDone();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSending(false);
    }
  }
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <FormError message={error} />
      <Field label="Nom de la catégorie" name="name" defaultValue={category?.name} required />
      <Field label="Ordre d’affichage" name="position" type="number" min={0} defaultValue={category?.position ?? 0} />
      <button className="btn-primary w-full" disabled={sending}>
        {sending && <Spinner />} Enregistrer
      </button>
    </form>
  );
}

type Dialog = { kind: "item"; item?: MenuItem; categoryId?: number } | { kind: "category"; category?: Category } | null;

export default function AdminMenu() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const toast = useToast();
  const { data, loading, error, reload, setData } = useApi<{ categories: Category[] }>("/menu");
  const [dialog, setDialog] = useState<Dialog>(null);

  async function toggle(item: MenuItem) {
    try {
      const res = await api<{ item: MenuItem }>(`/admin/menu-items/${item.id}/availability`, { method: "PATCH", body: { available: !item.available } });
      setData((d) =>
        d ? { categories: d.categories.map((c) => ({ ...c, items: c.items.map((i) => (i.id === item.id ? res.item : i)) })) } : d,
      );
      toast(res.item.available ? `${item.name} : disponible` : `${item.name} : épuisé`, "info");
    } catch (e) {
      toast(errorMessage(e), "error");
    }
  }

  async function removeItem(item: MenuItem) {
    if (!confirm(`Supprimer « ${item.name} » de la carte ? Les commandes passées le gardent dans leur historique.`)) return;
    try {
      await api(`/admin/menu-items/${item.id}`, { method: "DELETE" });
      toast("Plat supprimé.", "info");
      reload();
    } catch (e) {
      toast(errorMessage(e), "error");
    }
  }

  async function removeCategory(c: Category) {
    if (!confirm(`Supprimer la catégorie « ${c.name} » ?`)) return;
    try {
      await api(`/admin/categories/${c.id}`, { method: "DELETE" });
      toast("Catégorie supprimée.", "info");
      reload();
    } catch (e) {
      toast(errorMessage(e), "error");
    }
  }

  const close = () => setDialog(null);
  const done = () => {
    setDialog(null);
    reload();
  };

  if (loading && !data) return <PageLoader />;
  if (error) return <FormError message={error} />;
  const categories = data?.categories ?? [];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-charbon-muted">
          {isAdmin ? "Modifiez la carte, les prix et la disponibilité." : "Indiquez ce qui est épuisé : la carte en ligne se met à jour tout de suite."}
        </p>
        {isAdmin && (
          <div className="flex gap-2">
            <button className="btn-ghost btn-sm" onClick={() => setDialog({ kind: "category" })}>
              + Catégorie
            </button>
            <button className="btn-primary btn-sm" onClick={() => setDialog({ kind: "item" })} disabled={!categories.length}>
              + Plat
            </button>
          </div>
        )}
      </div>

      <div className="mt-6 space-y-8">
        {categories.map((c) => (
          <section key={c.id} className="card p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-charbon/10 pb-3">
              <h2 className="text-2xl font-bold">{c.name}</h2>
              {isAdmin && (
                <div className="flex gap-3 text-sm">
                  <button className="text-piment-dark underline" onClick={() => setDialog({ kind: "item", categoryId: c.id })}>
                    Ajouter un plat ici
                  </button>
                  <button className="text-charbon-muted underline" onClick={() => setDialog({ kind: "category", category: c })}>
                    Renommer
                  </button>
                  <button className="text-charbon-muted underline" onClick={() => removeCategory(c)}>
                    Supprimer
                  </button>
                </div>
              )}
            </div>
            {c.items.length === 0 ? (
              <p className="py-4 text-sm text-charbon-muted">Aucun plat dans cette catégorie.</p>
            ) : (
              <ul className="divide-y divide-charbon/10">
                {c.items.map((item) => (
                  <li key={item.id} className="flex flex-wrap items-center gap-3 py-3">
                    <span className={`min-w-0 flex-1 font-board text-lg ${item.available ? "" : "text-charbon-muted line-through"}`}>{item.name}</span>
                    <span className="w-16 font-board text-lg">{price(item.priceCents)}</span>
                    <button
                      onClick={() => toggle(item)}
                      role="switch"
                      aria-checked={item.available}
                      className={`rounded-full px-3 py-1 font-board text-xs uppercase tracking-wider transition ${
                        item.available ? "bg-feuille/15 text-feuille hover:bg-feuille/25" : "bg-charbon/10 text-charbon-muted hover:bg-charbon/20"
                      }`}
                    >
                      {item.available ? "Disponible" : "Épuisé"}
                    </button>
                    {isAdmin && (
                      <>
                        <button className="text-sm text-piment-dark underline" onClick={() => setDialog({ kind: "item", item })}>
                          Modifier
                        </button>
                        <button className="text-sm text-charbon-muted underline" onClick={() => removeItem(item)}>
                          Supprimer
                        </button>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>

      {dialog?.kind === "item" && (
        <Modal title={dialog.item ? "Modifier le plat" : "Nouveau plat"} onClose={close}>
          <ItemForm item={dialog.item} categories={categories} defaultCategory={dialog.categoryId} onDone={done} />
        </Modal>
      )}
      {dialog?.kind === "category" && (
        <Modal title={dialog.category ? "Renommer la catégorie" : "Nouvelle catégorie"} onClose={close}>
          <CategoryForm category={dialog.category} onDone={done} />
        </Modal>
      )}
    </div>
  );
}
