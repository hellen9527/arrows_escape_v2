export function HomeScreenGuide({ en }: { en: boolean }) {
  return (
    <details className="home-screen-guide">
      <summary>{en ? 'Add to Home Screen' : '添加到主屏幕'}</summary>
      <p>
        {en
          ? 'Launch from your home screen for a game window without browser toolbars.'
          : '从桌面图标打开，用没有浏览器工具栏的独立窗口玩。'}
      </p>
      <ol>
        <li>
          {en
            ? 'iPhone / iPad: open in Safari, tap Share, then Add to Home Screen. Keep Open as Web App on if offered.'
            : 'iPhone / iPad：用 Safari 打开，点「分享」→「添加到主屏幕」。如果出现「作为网页 App 打开」，保持开启。'}
        </li>
        <li>
          {en
            ? 'Android: open in Chrome, then choose Add to Home screen or Install app from the browser menu.'
            : 'Android：用 Chrome 打开，在浏览器菜单中选择「添加到主屏幕」或「安装应用」。'}
        </li>
      </ol>
      <p>
        {en
          ? 'If opened inside another app, first open this link in your browser. Your device may still show its status and gesture bars.'
          : '如果在其他 App 内打开，请先选择用浏览器打开。手机状态栏和底部手势区域可能仍会保留。'}
      </p>
      <small>
        {en
          ? 'An internet connection is required. Saves stay in this browser or home-screen app; another browser, device, or installation may start a separate save.'
          : '游玩需要联网。进度保存在当前浏览器或桌面应用中；换浏览器、设备或安装方式可能使用独立存档。'}
      </small>
    </details>
  );
}
