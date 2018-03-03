import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import * as path from 'path';
import * as vscode from 'vscode';

chai.use(chaiAsPromised);

import {expect} from 'chai';
import * as sinon from 'sinon';

import * as kit from '../../src/kit';
import {fs} from '../../src/pr';
import * as state from '../../src/state';


const here = __dirname;
function getTestResourceFilePath(filename: string): string {
  return path.normalize(path.join(here, '../../../test/unit_tests', filename));
}


suite('Kits test', async() => {
  suite('GUI test', async() => {
    let km: kit.KitManager;
    let gui_sandbox: sinon.SinonSandbox;
    setup(async() => {
      gui_sandbox = sinon.sandbox.create();
      let stateMock = gui_sandbox.createStubInstance(state.StateManager);
      sinon.stub(stateMock, 'activeKitName').get(function() { return null; }).set(function() {});
      const kit_file = getTestResourceFilePath('test_kit.json');
      km = new kit.KitManager(stateMock, kit_file);
    });
    teardown(async() => { gui_sandbox.restore(); });

    test('KitManager tests opening of kit file', async() => {
      let text: vscode.TextDocument|undefined;
      gui_sandbox.stub(vscode.window, "showTextDocument").callsFake(function(textDoc) {
        text = textDoc;
        return {document : text};
      });
      await km.initialize();

      const editor = await km.openKitsEditor();

      expect(text).to.be.not.undefined;
      if (text != undefined) {
        const rawKitsFromFile = (await fs.readFile(getTestResourceFilePath('test_kit.json'), 'utf8'));
        expect(editor.document.getText()).to.be.eq(rawKitsFromFile);
      } else {
      }
    }).timeout(10000);
  });

  test('KitManager tests event on change of active kit', async() => {
    let stateMock = sinon.createStubInstance(state.StateManager);
    let storedActivatedKitName: string = '';
    sinon.stub(stateMock, 'activeKitName').get(function() { return null; }).set(function(kit) {
      storedActivatedKitName = kit;
    });
    const km = new kit.KitManager(stateMock, getTestResourceFilePath('test_kit.json'));
    await km.initialize();
    // Check that each time we change the kit, it fires a signal
    let fired_kit: string|null = null;
    km.onActiveKitChanged(k => fired_kit = k!.name);
    for (const kit of km.kits) {
      const name = kit.name;
      // Set the kit
      await km.selectKitByName(name);
      // Check that we got the signal
      expect(fired_kit).to.eq(name);
      // Check that we've saved our change
      expect(storedActivatedKitName).to.eq(name);
    }
    km.dispose();
  }).timeout(10000);

  test('KitManager test load of kit from test file', async() => {
    let stateMock = sinon.createStubInstance(state.StateManager);
    sinon.stub(stateMock, 'activeKitName').get(function() { return null; }).set(function() {});
    const km = new kit.KitManager(stateMock, getTestResourceFilePath('test_kit.json'));

    await km.initialize();

    expect(km.kits.length).to.eq(6);
    expect(km.kits[0].name).to.eq("CompilerKit 1");
    expect(km.kits[1].name).to.eq("CompilerKit 2");
    expect(km.kits[2].name).to.eq("CompilerKit 3 with PreferedGenerator");
    expect(km.kits[3].name).to.eq("ToolchainKit 1");
    expect(km.kits[4].name).to.eq("VSCode Kit 1");
    expect(km.kits[5].name).to.eq("VSCode Kit 2");

    km.dispose();
  });

  test('KitManager test selection of last activated kit', async() => {
    let stateMock = sinon.createStubInstance(state.StateManager);

    sinon.stub(stateMock, 'activeKitName').get(function() { return "ToolchainKit 1"; }).set(function() {});
    const km = new kit.KitManager(stateMock, getTestResourceFilePath('test_kit.json'));

    await km.initialize();

    expect(km.activeKit).to.be.not.null;
    if (km.activeKit)
      expect(km.activeKit.name).to.eq("ToolchainKit 1");

    km.dispose();
  });

  test('KitManager test selection of a default kit', async() => {
    let stateMock = sinon.createStubInstance(state.StateManager);
    sinon.stub(stateMock, 'activeKitName').get(function() { return null; }).set(function() {});

    const km = new kit.KitManager(stateMock, getTestResourceFilePath('test_kit.json'));
    await km.initialize();

    expect(km.activeKit).to.be.null;
    km.dispose();
  });

  test('KitManager test selection of default kit if last activated kit is invalid', async() => {
    let stateMock = sinon.createStubInstance(state.StateManager);
    let storedActivatedKitName = "not replaced";
    sinon.stub(stateMock, 'activeKitName').get(function() { return "Unknown"; }).set(function(kit) {
      storedActivatedKitName = kit;
    });

    const km = new kit.KitManager(stateMock, getTestResourceFilePath('test_kit.json'));
    await km.initialize();

    expect(km.activeKit).to.be.null;
    expect(storedActivatedKitName).to.be.null;
    km.dispose();
  });
});
