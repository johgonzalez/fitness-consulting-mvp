export default function CommunityLoading() {
  return <main className="community-page community-loading" aria-busy="true" aria-label="Carregando Comunidade">
    <div className="community-loading-line community-loading-line--title" />
    <div className="community-loading-tabs" />
    {[0, 1, 2].map((item) => <div className="community-loading-post" key={item}><span /><div><b /><i /></div></div>)}
  </main>;
}
