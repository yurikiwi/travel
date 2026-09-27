/* 専用ページ遷移時に、前画面の「旅程一覧」状態を引き継いで白紙にならないようにする。 */
(()=>{const page=new URLSearchParams(location.search).get('page');if(!page)return;const openDetail=()=>{if(typeof render!=='function')return;view='detail';render()};openDetail();setTimeout(openDetail,0)})();
