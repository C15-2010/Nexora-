import React, { useEffect, useMemo, useState } from "react";
import {
  Activity, ArrowDownRight, ArrowUpRight, Boxes, BriefcaseBusiness, ChartNoAxesCombined,
  ChevronDown, CircleHelp, CreditCard, LayoutDashboard, LogOut, Menu, Package,
  Plus, Search, Settings, ShoppingBag, ShoppingCart, Sparkles, Users, Wallet, X,
  Pencil, Trash2, AlertTriangle, RefreshCw
} from "lucide-react";
import { isConfigured, supabase } from "./supabase";

const money = (v) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v || 0));
const dateBR = (v) => v ? new Date(`${v}T12:00:00`).toLocaleDateString("pt-BR") : "—";
const today = () => new Date().toISOString().slice(0, 10);

const nav = [
  ["Visão geral", "dashboard", LayoutDashboard],
  ["Produtos", "products", Package],
  ["Estoque", "stock", Boxes],
  ["Vendas", "sales", ShoppingCart],
  ["Clientes", "customers", Users],
  ["Despesas", "expenses", Wallet],
  ["Relatórios", "reports", ChartNoAxesCombined],
  ["Assistente IA", "assistant", Sparkles],
  ["Configurações", "settings", Settings],
];

function Auth({ onDone }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault(); setBusy(true); setError("");
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name } } });
        if (error) throw error;
        if (!data.session) setError("Conta criada. Confira seu e-mail para confirmar o cadastro e depois entre.");
        else onDone(data.session.user);
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onDone(data.user);
      }
    } catch (e) { setError(e.message || "Não foi possível autenticar."); }
    finally { setBusy(false); }
  }

  return <main className="auth-wrap">
    <div className="auth-brand"><div className="brand-mark">N</div><span>NEXORA</span></div>
    <section className="auth-card">
      <div className="eyebrow">GESTÃO INTELIGENTE</div>
      <h1>{mode === "login" ? "Bom ter você de volta." : "Comece a organizar seu negócio."}</h1>
      <p className="muted">Produtos, vendas, estoque e finanças em um só lugar.</p>
      <form onSubmit={submit} className="stack">
        {mode === "signup" && <label>Seu nome<input required value={name} onChange={e=>setName(e.target.value)} placeholder="Como podemos chamar você?" /></label>}
        <label>E-mail<input required type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="voce@email.com" /></label>
        <label>Senha<input required minLength="6" type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Mínimo de 6 caracteres" /></label>
        {error && <div className="notice">{error}</div>}
        <button className="primary full" disabled={busy}>{busy ? "Aguarde..." : mode === "login" ? "Entrar" : "Criar minha conta"}</button>
      </form>
      <p className="switch-auth">{mode === "login" ? "Ainda não tem conta?" : "Já possui uma conta?"} <button className="link-button" onClick={()=>{setMode(mode==="login"?"signup":"login");setError("");}}>{mode==="login"?"Criar conta":"Fazer login"}</button></p>
    </section>
    <p className="auth-foot">NEXORA · Seu negócio. Sua inteligência. Seu próximo nível.</p>
  </main>;
}

function Modal({ title, onClose, children }) {
  return <div className="modal-backdrop" onMouseDown={onClose}><section className="modal" onMouseDown={e=>e.stopPropagation()}>
    <div className="modal-head"><h2>{title}</h2><button className="icon-btn" onClick={onClose}><X size={19}/></button></div>{children}
  </section></div>;
}

function App() {
  const [user, setUser] = useState(null);
  const [business, setBusiness] = useState(null);
  const [page, setPage] = useState("dashboard");
  const [mobileNav, setMobileNav] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [modal, setModal] = useState(null);
  const [search, setSearch] = useState("");
  const [profileName, setProfileName] = useState("");
  const [profileSegment, setProfileSegment] = useState("Comércio");

  useEffect(() => {
    if (!isConfigured) { setLoading(false); return; }
    supabase.auth.getSession().then(({data}) => {
      if (data.session?.user) setUser(data.session.user);
      else setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      if (!session) { setBusiness(null); setProducts([]); setSales([]); setCustomers([]); setExpenses([]); setLoading(false); }
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => { if (user) loadWorkspace(); }, [user]);

  async function loadWorkspace() {
    setLoading(true);
    try {
      let { data: biz, error } = await supabase.from("businesses").select("*").order("created_at").limit(1).maybeSingle();
      if (error) throw error;
      if (!biz) {
        const { data, error: createError } = await supabase.from("businesses").insert({ owner_id: user.id, name: "Meu negócio", segment: "Comércio" }).select().single();
        if (createError) throw createError;
        biz = data;
      }
      setBusiness(biz); setProfileName(biz.name); setProfileSegment(biz.segment || "Comércio");
      await loadData(biz.id);
    } catch (e) { notify(e.message || "Erro ao carregar seus dados."); }
    finally { setLoading(false); }
  }

  async function loadData(id = business?.id) {
    if (!id) return;
    const [p,s,c,x] = await Promise.all([
      supabase.from("products").select("*").eq("business_id",id).order("created_at",{ascending:false}),
      supabase.from("sales").select("*, products(name)").eq("business_id",id).order("sold_at",{ascending:false}),
      supabase.from("customers").select("*").eq("business_id",id).order("created_at",{ascending:false}),
      supabase.from("expenses").select("*").eq("business_id",id).order("spent_at",{ascending:false})
    ]);
    for (const r of [p,s,c,x]) if (r.error) throw r.error;
    setProducts(p.data || []); setSales(s.data || []); setCustomers(c.data || []); setExpenses(x.data || []);
  }

  function notify(message) { setToast(message); window.setTimeout(()=>setToast(""),3500); }
  async function logout() { await supabase.auth.signOut(); setUser(null); }
  const totalSales = sales.reduce((a,b)=>a+Number(b.total),0);
  const totalExpenses = expenses.reduce((a,b)=>a+Number(b.amount),0);
  const lowStock = products.filter(p=>Number(p.stock)<=Number(p.min_stock)).length;
  const productCost = sales.reduce((a,s)=>a + Number(s.unit_cost||0)*Number(s.quantity||1),0);
  const grossProfit = totalSales-productCost;
  const profit = grossProfit-totalExpenses;

  if (!isConfigured) return <div className="setup-screen"><div className="brand-mark">N</div><h1>Vamos conectar o NEXORA.</h1><p>O código está pronto, mas falta conectar seu projeto Supabase para habilitar contas e salvar dados.</p><ol><li>Crie um projeto gratuito no Supabase.</li><li>Execute o arquivo <code>supabase/migrations/001_initial_schema.sql</code> no SQL Editor.</li><li>Copie <code>.env.example</code> para <code>.env</code> e preencha a URL e a chave anon do projeto.</li><li>Instale as dependências e inicie o app conforme o README.</li></ol><p className="muted">Nenhum dado fictício será exibido ou salvo.</p></div>;
  if (loading) return <div className="loading-screen"><div className="brand-mark">N</div><p>Preparando seu espaço...</p></div>;
  if (!user) return <Auth onDone={setUser}/>;

  const pageTitle = nav.find(n=>n[1]===page)?.[0] || "Visão geral";
  const filteredProducts = products.filter(p=>p.name.toLowerCase().includes(search.toLowerCase()) || (p.sku||"").toLowerCase().includes(search.toLowerCase()));
  const filteredCustomers = customers.filter(c=>c.name.toLowerCase().includes(search.toLowerCase()));

  async function saveRecord(table, payload, id) {
    try {
      const base = { ...payload, business_id: business.id };
      const query = id ? supabase.from(table).update(base).eq("id",id).eq("business_id",business.id) : supabase.from(table).insert(base);
      const { error } = await query;
      if (error) throw error;
      await loadData(); setModal(null); notify("Alterações salvas com sucesso.");
    } catch(e) { notify(e.message || "Não foi possível salvar."); }
  }
  async function removeRecord(table,id) {
    if (!window.confirm("Tem certeza de que deseja excluir este registro?")) return;
    const {error}=await supabase.from(table).delete().eq("id",id).eq("business_id",business.id);
    if(error) notify(error.message); else { await loadData(); notify("Registro excluído."); }
  }

  return <div className="app-shell">
    <aside className={`sidebar ${mobileNav?"open":""}`}>
      <div className="side-brand"><div className="brand-mark">N</div><span>NEXORA</span><button className="icon-btn mobile-close" onClick={()=>setMobileNav(false)}><X/></button></div>
      <div className="workspace"><div className="workspace-icon"><BriefcaseBusiness size={17}/></div><div><b>{business?.name || "Meu negócio"}</b><small>Plano gratuito</small></div><ChevronDown size={15}/></div>
      <div className="nav-label">MENU PRINCIPAL</div>
      <nav>{nav.map(([label,key,Icon])=><button key={key} className={`nav-item ${page===key?"active":""}`} onClick={()=>{setPage(key);setMobileNav(false);setSearch("");}}><Icon size={18}/><span>{label}</span>{key==="stock"&&lowStock>0&&<i className="nav-count">{lowStock}</i>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="help-card"><div className="help-icon"><CircleHelp size={18}/></div><b>Precisa de ajuda?</b><p>Organize seu negócio com mais clareza.</p><button onClick={()=>setPage("assistant")}>Conhecer assistente <span>→</span></button></div><div className="user-mini"><div className="avatar">{(user.user_metadata?.full_name||user.email||"U").slice(0,1).toUpperCase()}</div><div className="user-info"><b>{user.user_metadata?.full_name||"Minha conta"}</b><small>{user.email}</small></div><button className="icon-btn" title="Sair" onClick={logout}><LogOut size={17}/></button></div></div>
    </aside>
    {mobileNav&&<div className="nav-scrim" onClick={()=>setMobileNav(false)}></div>}
    <main className="main-area">
      <header className="topbar"><div className="top-left"><button className="icon-btn mobile-menu" onClick={()=>setMobileNav(true)}><Menu/></button><div><div className="breadcrumb">NEXORA <span>/</span> {pageTitle}</div><h1>{pageTitle}</h1></div></div><div className="top-actions"><div className="date-pill">{new Date().toLocaleDateString("pt-BR",{day:"2-digit",month:"short",year:"numeric"})}</div><button className="avatar top-avatar" onClick={()=>setPage("settings")}>{(user.user_metadata?.full_name||user.email||"U").slice(0,1).toUpperCase()}</button></div></header>
      <div className="content">
        {page==="dashboard"&&<Dashboard sales={sales} expenses={expenses} products={products} customers={customers} totalSales={totalSales} totalExpenses={totalExpenses} profit={profit} grossProfit={grossProfit} lowStock={lowStock} onNavigate={setPage}/>}
        {page==="products"&&<Products products={filteredProducts} search={search} setSearch={setSearch} onAdd={()=>setModal({type:"product"})} onEdit={p=>setModal({type:"product",record:p})} onDelete={p=>removeRecord("products",p.id)}/>}
        {page==="stock"&&<Stock products={products} onEdit={p=>setModal({type:"product",record:p})}/>}
        {page==="sales"&&<Sales sales={sales} products={products} customers={customers} onAdd={()=>setModal({type:"sale"})} onDelete={s=>removeRecord("sales",s.id)}/>}
        {page==="customers"&&<Customers customers={filteredCustomers} search={search} setSearch={setSearch} onAdd={()=>setModal({type:"customer"})} onEdit={c=>setModal({type:"customer",record:c})} onDelete={c=>removeRecord("customers",c.id)}/>}
        {page==="expenses"&&<Expenses expenses={expenses} onAdd={()=>setModal({type:"expense"})} onDelete={x=>removeRecord("expenses",x.id)}/>}
        {page==="reports"&&<Reports sales={sales} expenses={expenses} products={products} totalSales={totalSales} totalExpenses={totalExpenses} profit={profit} grossProfit={grossProfit} productCost={productCost}/>}
        {page==="assistant"&&<Assistant sales={sales} expenses={expenses} products={products} customers={customers} totalSales={totalSales} totalExpenses={totalExpenses} profit={profit}/>}
        {page==="settings"&&<SettingsPage business={business} profileName={profileName} setProfileName={setProfileName} profileSegment={profileSegment} setProfileSegment={setProfileSegment} onSave={async()=>{const {error}=await supabase.from("businesses").update({name:profileName,segment:profileSegment}).eq("id",business.id);if(error)notify(error.message);else{setBusiness({...business,name:profileName,segment:profileSegment});notify("Dados do negócio atualizados.");}}} onRefresh={()=>loadData()}/>}
      </div>
    </main>
    {modal&&<RecordModal modal={modal} products={products} customers={customers} onClose={()=>setModal(null)} onSave={saveRecord}/>}
    {toast&&<div className="toast">{toast}</div>}
  </div>;
}

function PageIntro({title,description,action}) { return <div className="page-intro"><div><h2>{title}</h2><p>{description}</p></div>{action}</div>; }
function Stat({label,value,icon:Icon,tone="blue",hint,trend}) { return <div className="stat-card"><div className="stat-top"><span>{label}</span><span className={`stat-icon ${tone}`}><Icon size={19}/></span></div><strong>{value}</strong><small>{hint}</small></div>; }
function Dashboard({sales,expenses,products,customers,totalSales,totalExpenses,profit,grossProfit,lowStock,onNavigate}) {
  const recent=sales.slice(0,5);
  return <><div className="welcome-row"><div><div className="eyebrow">SEU NEGÓCIO EM FOCO</div><h2>Vamos fazer acontecer. <span>✦</span></h2><p>Acompanhe os números e mantenha tudo sob controle.</p></div><button className="primary" onClick={()=>onNavigate("sales")}><Plus size={17}/> Registrar venda</button></div>
    <div className="stats-grid"><Stat label="Vendas registradas" value={money(totalSales)} icon={ArrowUpRight} hint={`${sales.length} vendas no total`} tone="green"/><Stat label="Despesas" value={money(totalExpenses)} icon={ArrowDownRight} hint={`${expenses.length} lançamentos`} tone="red"/><Stat label="Resultado estimado" value={money(profit)} icon={ChartNoAxesCombined} hint="Após custo dos produtos e despesas" tone="purple"/><Stat label="Produtos cadastrados" value={products.length} icon={Package} hint={`${lowStock} com estoque baixo`} tone="blue"/></div>
    <div className="dashboard-grid"><section className="panel"><div className="panel-head"><div><h3>Vendas recentes</h3><p>Últimos lançamentos registrados</p></div><button className="text-action" onClick={()=>onNavigate("sales")}>Ver todas →</button></div>{recent.length?<div className="table-wrap"><table><thead><tr><th>Produto / descrição</th><th>Data</th><th>Valor</th></tr></thead><tbody>{recent.map(s=><tr key={s.id}><td><b>{s.products?.name||s.description||"Venda"}</b></td><td>{dateBR(s.sold_at)}</td><td className="amount positive">{money(s.total)}</td></tr>)}</tbody></table></div>:<Empty icon={ShoppingBag} title="Nenhuma venda por aqui" text="Registre sua primeira venda para começar a acompanhar os resultados."/>}</section>
      <section className="panel"><div className="panel-head"><div><h3>Estoque em atenção</h3><p>Produtos no limite mínimo ou abaixo</p></div><button className="text-action" onClick={()=>onNavigate("stock")}>Ver estoque →</button></div>{products.filter(p=>Number(p.stock)<=Number(p.min_stock)).slice(0,5).length?products.filter(p=>Number(p.stock)<=Number(p.min_stock)).slice(0,5).map(p=><div className="stock-line" key={p.id}><div className="product-dot">{p.name.slice(0,1).toUpperCase()}</div><div className="stock-name"><b>{p.name}</b><small>Limite mínimo: {p.min_stock}</small></div><span className="stock-warning">{p.stock} un.</span></div>):<Empty icon={Boxes} title="Estoque saudável" text="Nenhum produto atingiu o limite mínimo cadastrado."/>}</section></div>
    <div className="quick-grid"><button onClick={()=>onNavigate("products")}><Package/><span><b>Cadastrar produto</b><small>Organize seu catálogo</small></span><Plus/></button><button onClick={()=>onNavigate("customers")}><Users/><span><b>Adicionar cliente</b><small>Construa sua carteira</small></span><Plus/></button><button onClick={()=>onNavigate("expenses")}><Wallet/><span><b>Lançar despesa</b><small>Controle suas saídas</small></span><Plus/></button></div>
  </>;
}
function Empty({icon:Icon,title,text}) { return <div className="empty"><div><Icon size={22}/></div><b>{title}</b><p>{text}</p></div>; }
function Toolbar({search,setSearch,placeholder="Buscar..."}) { return <div className="toolbar"><div className="searchbox"><Search size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder={placeholder}/></div></div>; }
function Products({products,search,setSearch,onAdd,onEdit,onDelete}) {
  return <><PageIntro title="Seus produtos" description="Cadastre itens, acompanhe preços e mantenha o estoque organizado." action={<button className="primary" onClick={onAdd}><Plus size={17}/> Novo produto</button>}/><div className="panel"><Toolbar search={search} setSearch={setSearch} placeholder="Buscar por nome ou SKU..."/>{products.length?<div className="table-wrap"><table><thead><tr><th>Produto</th><th>SKU</th><th>Preço de venda</th><th>Estoque</th><th>Status</th><th></th></tr></thead><tbody>{products.map(p=><tr key={p.id}><td><div className="table-product"><div className="product-dot">{p.name.slice(0,1).toUpperCase()}</div><b>{p.name}</b></div></td><td>{p.sku||"—"}</td><td>{money(p.price)}</td><td>{p.stock}</td><td><span className={`status ${Number(p.stock)<=Number(p.min_stock)?"warning":"good"}`}>{Number(p.stock)<=Number(p.min_stock)?"Estoque baixo":"Disponível"}</span></td><td><div className="row-actions"><button className="icon-btn" onClick={()=>onEdit(p)} title="Editar"><Pencil size={16}/></button><button className="icon-btn danger" onClick={()=>onDelete(p)} title="Excluir"><Trash2 size={16}/></button></div></td></tr>)}</tbody></table></div>:<Empty icon={Package} title={search?"Nenhum resultado encontrado":"Seu catálogo começa aqui"} text={search?"Tente outro termo de busca.":"Adicione seus produtos para acompanhar preços e quantidades."}/>}</div></>;
}
function Stock({products,onEdit}) { return <><PageIntro title="Controle de estoque" description="Veja o que está disponível e identifique itens que precisam de reposição."/><div className="stats-grid compact"><Stat label="Itens cadastrados" value={products.length} icon={Package} hint="Produtos no catálogo"/><Stat label="Estoque baixo" value={products.filter(p=>Number(p.stock)<=Number(p.min_stock)).length} icon={AlertTriangle} hint="No mínimo ou abaixo" tone="red"/><Stat label="Unidades disponíveis" value={products.reduce((a,p)=>a+Number(p.stock),0)} icon={Boxes} hint="Soma das quantidades" tone="green"/></div><div className="panel"><div className="panel-head"><div><h3>Posição do estoque</h3><p>Atualizado com seus cadastros</p></div></div>{products.length?<div className="table-wrap"><table><thead><tr><th>Produto</th><th>Quantidade</th><th>Mínimo</th><th>Situação</th><th></th></tr></thead><tbody>{products.map(p=><tr key={p.id}><td><b>{p.name}</b></td><td>{p.stock} un.</td><td>{p.min_stock} un.</td><td><span className={`status ${Number(p.stock)<=Number(p.min_stock)?"warning":"good"}`}>{Number(p.stock)<=Number(p.min_stock)?"Repor":"Normal"}</span></td><td><button className="text-action" onClick={()=>onEdit(p)}>Ajustar</button></td></tr>)}</tbody></table></div>:<Empty icon={Boxes} title="Sem produtos cadastrados" text="Cadastre produtos para acompanhar o estoque."/>}</div></>; }
function Sales({sales,products,customers,onAdd,onDelete}) { return <><PageIntro title="Vendas" description="Registre vendas e acompanhe o histórico do seu negócio." action={<button className="primary" onClick={onAdd}><Plus size={17}/> Registrar venda</button>}/><div className="panel"><div className="panel-head"><div><h3>Histórico de vendas</h3><p>{sales.length} registros</p></div></div>{sales.length?<div className="table-wrap"><table><thead><tr><th>Descrição</th><th>Cliente</th><th>Data</th><th>Quantidade</th><th>Pagamento</th><th>Total</th><th></th></tr></thead><tbody>{sales.map(s=><tr key={s.id}><td><b>{s.products?.name||s.description||"Venda"}</b></td><td>{s.customer_name||"—"}</td><td>{dateBR(s.sold_at)}</td><td>{s.quantity||1}</td><td>{s.payment_method||"—"}</td><td className="amount positive">{money(s.total)}</td><td><button className="icon-btn danger" title="Cancelar venda e devolver ao estoque" onClick={()=>onDelete(s)}><Trash2 size={16}/></button></td></tr>)}</tbody></table></div>:<Empty icon={ShoppingCart} title="Nenhuma venda registrada" text="Quando registrar uma venda, ela aparecerá aqui."/>}</div></>; }
function Customers({customers,search,setSearch,onAdd,onEdit,onDelete}) { return <><PageIntro title="Clientes" description="Guarde informações importantes e acompanhe seus relacionamentos." action={<button className="primary" onClick={onAdd}><Plus size={17}/> Novo cliente</button>}/><div className="panel"><Toolbar search={search} setSearch={setSearch} placeholder="Buscar cliente..."/>{customers.length?<div className="table-wrap"><table><thead><tr><th>Nome</th><th>Telefone</th><th>E-mail</th><th></th></tr></thead><tbody>{customers.map(c=><tr key={c.id}><td><b>{c.name}</b></td><td>{c.phone||"—"}</td><td>{c.email||"—"}</td><td><div className="row-actions"><button className="icon-btn" onClick={()=>onEdit(c)}><Pencil size={16}/></button><button className="icon-btn danger" onClick={()=>onDelete(c)}><Trash2 size={16}/></button></div></td></tr>)}</tbody></table></div>:<Empty icon={Users} title="Sua carteira de clientes" text="Adicione clientes para manter os contatos organizados."/>}</div></>; }
function Expenses({expenses,onAdd,onDelete}) { return <><PageIntro title="Despesas" description="Registre custos e acompanhe o dinheiro que sai do caixa." action={<button className="primary" onClick={onAdd}><Plus size={17}/> Nova despesa</button>}/><div className="panel"><div className="panel-head"><div><h3>Lançamentos</h3><p>{expenses.length} despesas registradas</p></div></div>{expenses.length?<div className="table-wrap"><table><thead><tr><th>Descrição</th><th>Categoria</th><th>Data</th><th>Valor</th><th></th></tr></thead><tbody>{expenses.map(x=><tr key={x.id}><td><b>{x.description}</b></td><td>{x.category||"Geral"}</td><td>{dateBR(x.spent_at)}</td><td className="amount negative">{money(x.amount)}</td><td><button className="icon-btn danger" onClick={()=>onDelete(x)}><Trash2 size={16}/></button></td></tr>)}</tbody></table></div>:<Empty icon={Wallet} title="Nenhuma despesa lançada" text="Registre custos fixos e variáveis para entender seu resultado."/>}</div></>; }
function Reports({sales,expenses,products,totalSales,totalExpenses,profit,grossProfit,productCost}) { const byProduct=Object.values(sales.reduce((a,s)=>{const k=s.products?.name||s.description||"Outros";a[k]??={name:k,total:0,qty:0};a[k].total+=Number(s.total);a[k].qty+=Number(s.quantity||1);return a;},{})).sort((a,b)=>b.total-a.total).slice(0,5);return <><PageIntro title="Relatórios" description="Uma leitura direta dos dados que você registrou."/><div className="stats-grid compact"><Stat label="Receita registrada" value={money(totalSales)} icon={ArrowUpRight} hint={`${sales.length} vendas`} tone="green"/><Stat label="Custo dos produtos vendidos" value={money(productCost)} icon={Boxes} hint="Custo salvo no momento da venda" tone="blue"/><Stat label="Lucro bruto estimado" value={money(grossProfit)} icon={Activity} hint="Receita menos custo dos itens" tone="purple"/><Stat label="Resultado estimado" value={money(profit)} icon={Activity} hint="Lucro bruto menos despesas" tone="green"/></div><div className="panel"><div className="panel-head"><div><h3>Vendas por produto / descrição</h3><p>Ordenado pelo maior valor vendido</p></div></div>{byProduct.length?byProduct.map((p,i)=><div className="report-line" key={p.name}><span className="rank">{i+1}</span><div className="report-name"><b>{p.name}</b><small>{p.qty} unidade(s)</small></div><b>{money(p.total)}</b></div>):<Empty icon={ChartNoAxesCombined} title="Ainda não há dados suficientes" text="Registre vendas para gerar este relatório."/>}</div><p className="footnote">Os valores são estimativas com base apenas nos registros cadastrados no NEXORA. Não incluem impostos, taxas ou custos não lançados.</p></>; }
function Assistant({sales,expenses,products,customers,totalSales,totalExpenses,profit}) { const [question,setQuestion]=useState("");const [answer,setAnswer]=useState("");function ask(e){e.preventDefault();const q=question.toLowerCase();let a;if(/lucro|resultado/.test(q))a=`Com os dados registrados, seu resultado estimado é ${money(profit)}: ${money(totalSales)} em vendas menos ${money(totalExpenses)} em despesas. Esse cálculo considera os custos cadastrados nos produtos e as despesas lançadas; ainda pode não incluir impostos, taxas ou outros custos não informados.`;else if(/venda|fatur|receita/.test(q))a=`Você registrou ${sales.length} venda(s), totalizando ${money(totalSales)}.`;else if(/despesa|gasto|custo/.test(q))a=`Você cadastrou ${expenses.length} despesa(s), somando ${money(totalExpenses)}.`;else if(/estoque|produto|repor/.test(q)){const low=products.filter(p=>Number(p.stock)<=Number(p.min_stock));a=low.length?`Encontrei ${low.length} produto(s) no limite mínimo ou abaixo: ${low.map(p=>`${p.name} (${p.stock} un.; mínimo ${p.min_stock})`).join("; ")}.`:"Nenhum produto está no limite mínimo de estoque, conforme os dados cadastrados.";}else if(/cliente/.test(q))a=`Você tem ${customers.length} cliente(s) cadastrado(s).`;else a="Posso responder perguntas sobre vendas, despesas, resultado estimado, estoque e clientes. Tente perguntar, por exemplo: “Qual foi meu resultado?” ou “Quais produtos preciso repor?”.";setAnswer(a);}return <><PageIntro title="Assistente NEXORA" description="Faça perguntas sobre os dados que você registrou no sistema."/><div className="assistant-card"><div className="assistant-orb"><Sparkles size={25}/></div><div className="eyebrow">ASSISTENTE DE DADOS · VERSÃO 0.2</div><h2>Entenda melhor o seu negócio.</h2><p>Faça uma pergunta e receba uma resposta calculada a partir dos seus registros.</p><div className="suggestions"><button onClick={()=>setQuestion("Qual foi meu resultado?")}>Qual foi meu resultado?</button><button onClick={()=>setQuestion("Quais produtos preciso repor?")}>Quais produtos preciso repor?</button><button onClick={()=>setQuestion("Quanto vendi?")}>Quanto vendi?</button></div><form onSubmit={ask} className="ask-form"><input value={question} onChange={e=>setQuestion(e.target.value)} placeholder="Pergunte sobre suas vendas, despesas ou estoque..." required/><button className="primary"><Sparkles size={17}/> Perguntar</button></form>{answer&&<div className="answer-box"><b>Resposta baseada nos seus dados</b><p>{answer}</p></div>}</div><p className="footnote">Este assistente usa regras locais e cálculos dos seus registros; ainda não é uma IA generativa. O resultado considera o custo dos produtos vendidos quando informado. Uma integração com IA poderá ser adicionada posteriormente por meio de um backend seguro.</p></>; }
function SettingsPage({business,profileName,setProfileName,profileSegment,setProfileSegment,onSave,onRefresh}) { return <><PageIntro title="Configurações" description="Gerencie as informações básicas do seu espaço."/><div className="panel settings-panel"><h3>Dados do negócio</h3><p className="muted">Essas informações identificam seu espaço no NEXORA.</p><label>Nome do negócio<input value={profileName} onChange={e=>setProfileName(e.target.value)} maxLength="80"/></label><label>Tipo de negócio<select value={profileSegment} onChange={e=>setProfileSegment(e.target.value)}><option>Loja de roupas</option><option>Mercado / mercearia</option><option>Restaurante / alimentação</option><option>Cosméticos</option><option>Eletrônicos</option><option>Papelaria</option><option>Loja virtual</option><option>Vendedor autônomo</option><option>Prestador de serviços</option><option>Outro</option></select></label><div className="settings-actions"><button className="primary" onClick={onSave}>Salvar alterações</button><button className="secondary" onClick={onRefresh}><RefreshCw size={16}/> Atualizar dados</button></div><div className="settings-meta"><span>Identificador do negócio</span><code>{business?.id}</code></div></div><div className="panel settings-panel"><h3>Conta e segurança</h3><p className="muted">Sua conta é protegida pela autenticação do Supabase. Os dados do negócio são separados por políticas de segurança no banco.</p></div></>; }

function RecordModal({modal,products,customers,onClose,onSave}) {
  const record=modal.record||{};const [form,setForm]=useState(()=>modal.type==="sale"?{product_id:"",customer_id:"",customer_name:"",quantity:1,total:"",discount:0,payment_method:"Pix",sold_at:today(),description:""}:modal.type==="expense"?{description:"",category:"",amount:"",spent_at:today()}:modal.type==="customer"?{name:"",phone:"",email:""}:{name:"",sku:"",price:"",cost:"",stock:0,min_stock:0,category:""});
  useEffect(()=>{if(modal.record)setForm({...form,...record});},[]);
  function change(k,v){setForm(f=>({...f,[k]:v}));}
  function submit(e){e.preventDefault();if(modal.type==="sale"){const p=products.find(x=>x.id===form.product_id);const qty=Number(form.quantity);if(p&&qty>Number(p.stock)){alert("Quantidade maior que o estoque disponível.");return;}onSave("sales",{product_id:form.product_id||null,customer_id:form.customer_id||null,customer_name:form.customer_name||customers.find(c=>c.id===form.customer_id)?.name||null,description:form.description||p?.name||"Venda",quantity:qty,subtotal:Number(form.total),discount:Number(form.discount||0),total:Math.max(0,Number(form.total)-Number(form.discount||0)),payment_method:form.payment_method||"Não informado",sold_at:form.sold_at},record.id);return;}if(modal.type==="expense")return onSave("expenses",{...form,amount:Number(form.amount),spent_at:form.spent_at},record.id);if(modal.type==="customer")return onSave("customers",form,record.id);return onSave("products",{...form,price:Number(form.price),cost:Number(form.cost||0),stock:Number(form.stock),min_stock:Number(form.min_stock)},record.id);}
  const title={product:record.id?"Editar produto":"Novo produto",sale:"Registrar venda",customer:record.id?"Editar cliente":"Novo cliente",expense:"Nova despesa"}[modal.type];
  return <Modal title={title} onClose={onClose}><form className="record-form" onSubmit={submit}>
    {modal.type==="product"&&<><label>Nome do produto<input required value={form.name||""} onChange={e=>change("name",e.target.value)}/></label><div className="form-grid"><label>SKU / Código<input value={form.sku||""} onChange={e=>change("sku",e.target.value)}/></label><label>Categoria<input value={form.category||""} onChange={e=>change("category",e.target.value)}/></label><label>Preço de venda (R$)<input required type="number" min="0" step="0.01" value={form.price??""} onChange={e=>change("price",e.target.value)}/></label><label>Custo (R$)<input type="number" min="0" step="0.01" value={form.cost??""} onChange={e=>change("cost",e.target.value)}/></label><label>Estoque atual<input required type="number" min="0" step="1" value={form.stock??0} onChange={e=>change("stock",e.target.value)}/></label><label>Estoque mínimo<input type="number" min="0" step="1" value={form.min_stock??0} onChange={e=>change("min_stock",e.target.value)}/></label></div></>}
    {modal.type==="customer"&&<><label>Nome completo<input required value={form.name||""} onChange={e=>change("name",e.target.value)}/></label><label>Telefone<input value={form.phone||""} onChange={e=>change("phone",e.target.value)}/></label><label>E-mail<input type="email" value={form.email||""} onChange={e=>change("email",e.target.value)}/></label></>}
    {modal.type==="expense"&&<><label>Descrição<input required value={form.description||""} onChange={e=>change("description",e.target.value)}/></label><div className="form-grid"><label>Categoria<input value={form.category||""} onChange={e=>change("category",e.target.value)} placeholder="Ex.: aluguel, transporte"/></label><label>Valor (R$)<input required type="number" min="0.01" step="0.01" value={form.amount??""} onChange={e=>change("amount",e.target.value)}/></label><label>Data<input required type="date" value={form.spent_at||today()} onChange={e=>change("spent_at",e.target.value)}/></label></div></>}
    {modal.type==="sale"&&<><label>Produto (opcional)<select value={form.product_id||""} onChange={e=>{const p=products.find(x=>x.id===e.target.value);change("product_id",e.target.value);if(p)change("total",(Number(p.price)*Number(form.quantity||1)).toFixed(2));}}><option value="">Venda sem produto vinculado</option>{products.map(p=><option key={p.id} value={p.id}>{p.name} — {p.stock} em estoque</option>)}</select></label><div className="form-grid"><label>Quantidade<input required type="number" min="1" step="1" value={form.quantity||1} onChange={e=>{change("quantity",e.target.value);const p=products.find(x=>x.id===form.product_id);if(p)change("total",(Number(p.price)*Number(e.target.value)).toFixed(2));}}/></label><label>Subtotal antes do desconto (R$)<input required type="number" min="0.01" step="0.01" value={form.total??""} onChange={e=>change("total",e.target.value)}/></label></div><label>Forma de pagamento<select value={form.payment_method||"Pix"} onChange={e=>change("payment_method",e.target.value)}><option>Pix</option><option>Dinheiro</option><option>Cartão de débito</option><option>Cartão de crédito</option><option>Transferência</option><option>Outro</option></select></label><label>Desconto aplicado (R$)<input type="number" min="0" step="0.01" value={form.discount??0} onChange={e=>change("discount",e.target.value)}/></label><label>Cliente (opcional)<select value={form.customer_id||""} onChange={e=>change("customer_id",e.target.value)}><option value="">Sem cliente vinculado</option>{customers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label>Nome do cliente, se não estiver cadastrado<input value={form.customer_name||""} onChange={e=>change("customer_name",e.target.value)}/></label><label>Descrição (opcional)<input value={form.description||""} onChange={e=>change("description",e.target.value)}/></label><label>Data da venda<input required type="date" value={form.sold_at||today()} onChange={e=>change("sold_at",e.target.value)}/></label><p className="form-hint">Ao salvar, o estoque será baixado automaticamente. Se cancelar a venda pelo histórico, as unidades voltarão ao estoque. O custo do produto será guardado para estimar o lucro.</p></>}
    <div className="modal-actions"><button type="button" className="secondary" onClick={onClose}>Cancelar</button><button className="primary">Salvar</button></div>
  </form></Modal>;
}

export default App;
