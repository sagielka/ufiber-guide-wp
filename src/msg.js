/* Outlook .msg reader.
   A .msg is an OLE compound file, not text. Reading it as text produces numbers
   that are not in the message, so the guide parses the container properly and
   pulls out the subject, the body and the attachments (pictures pasted into the
   body are attachments too). If that fails it says so rather than guessing. */
function msgRead(buf) {
  const d = new DataView(buf), u8 = new Uint8Array(buf);
  if (buf.byteLength < 512) return null;
  // signature D0 CF 11 E0 A1 B1 1A E1
  const sig = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];
  for (let i = 0; i < 8; i++) if (u8[i] !== sig[i]) return null;

  const secShift = d.getUint16(0x1e, true), miniShift = d.getUint16(0x20, true);
  const secSize = 1 << secShift, miniSize = 1 << miniShift;
  const dirStart = d.getUint32(0x30, true);
  const miniCutoff = d.getUint32(0x38, true) || 4096;
  const miniFatStart = d.getUint32(0x3c, true);
  const difatStart = d.getUint32(0x44, true), difatCount = d.getUint32(0x48, true);
  const off = (s) => (s + 1) * secSize;
  const ENDOFCHAIN = 0xfffffffe, FREESECT = 0xffffffff;

  // the FAT sector list: 109 entries in the header, then the DIFAT chain
  const fatSectors = [];
  for (let i = 0; i < 109; i++) {
    const v = d.getUint32(0x4c + i * 4, true);
    if (v === FREESECT || v === ENDOFCHAIN) break;
    fatSectors.push(v);
  }
  let ds = difatStart;
  for (let n = 0; n < difatCount && ds !== ENDOFCHAIN && ds !== FREESECT; n++) {
    const base = off(ds), per = secSize / 4 - 1;
    for (let i = 0; i < per; i++) {
      const v = d.getUint32(base + i * 4, true);
      if (v !== FREESECT && v !== ENDOFCHAIN) fatSectors.push(v);
    }
    ds = d.getUint32(base + per * 4, true);
  }
  const fatPer = secSize / 4;
  const fat = (s) => {
    const idx = Math.floor(s / fatPer), rem = s % fatPer;
    if (idx >= fatSectors.length) return ENDOFCHAIN;
    return d.getUint32(off(fatSectors[idx]) + rem * 4, true);
  };
  const chain = (start, limit = 1 << 20) => {
    const out = []; let s = start, guard = 0;
    while (s !== ENDOFCHAIN && s !== FREESECT && guard++ < limit) { out.push(s); s = fat(s); }
    return out;
  };
  const readChain = (start, size) => {
    const secs = chain(start), out = new Uint8Array(secs.length * secSize);
    secs.forEach((s, i) => out.set(u8.subarray(off(s), off(s) + secSize), i * secSize));
    return out.subarray(0, size == null ? out.length : size);
  };

  // directory entries
  const dirBytes = readChain(dirStart);
  const dv = new DataView(dirBytes.buffer, dirBytes.byteOffset, dirBytes.byteLength);
  const entries = [];
  for (let p = 0; p + 128 <= dirBytes.length; p += 128) {
    const nameLen = dv.getUint16(p + 0x40, true);
    if (!nameLen) { entries.push(null); continue; }
    let name = '';
    for (let i = 0; i < nameLen - 2; i += 2) name += String.fromCharCode(dv.getUint16(p + i, true));
    entries.push({ name, type: dv.getUint8(p + 0x42), left: dv.getUint32(p + 0x44, true), right: dv.getUint32(p + 0x48, true),
      child: dv.getUint32(p + 0x4c, true), start: dv.getUint32(p + 0x74, true), size: dv.getUint32(p + 0x78, true) });
  }
  const root = entries.find(e => e && e.type === 5);
  if (!root) return null;
  // the children of a storage sit in a sibling tree under its child pointer
  const kids = (parent) => {
    const out = [], seen = new Set();
    const visit = (j) => {
      if (j == null || j >= entries.length || !entries[j] || seen.has(j) || seen.size > 4096) return;
      seen.add(j); visit(entries[j].left); out.push(entries[j]); visit(entries[j].right);
    };
    visit(parent.child);
    return out;
  };
  const top = kids(root);

  // small streams live inside the root's mini stream
  let miniData = null, miniFat = null;
  const getMini = () => {
    if (!miniData) miniData = readChain(root.start, root.size);
    if (!miniFat) miniFat = readChain(miniFatStart);
    return true;
  };
  const readStream = (e) => {
    if (e.size >= miniCutoff) return readChain(e.start, e.size);
    getMini();
    const mv = new DataView(miniFat.buffer, miniFat.byteOffset, miniFat.byteLength);
    const out = new Uint8Array(Math.ceil(e.size / miniSize) * miniSize);
    let s = e.start, i = 0, guard = 0;
    while (s !== ENDOFCHAIN && s !== FREESECT && guard++ < 1 << 20) {
      out.set(miniData.subarray(s * miniSize, s * miniSize + miniSize), i * miniSize);
      i++;
      const idx = s * 4;
      s = idx + 4 <= miniFat.length ? mv.getUint32(idx, true) : ENDOFCHAIN;
    }
    return out.subarray(0, e.size);
  };
  // the message's own properties are direct children of the root; an attached
  // e-mail carries its own subject and body deeper in the tree
  const findIn = (list, suffix) => list.find(e => e && e.type === 2 && e.name.indexOf(suffix) >= 0);
  const find = (suffix) => findIn(top, suffix) || (top.length ? null : findIn(entries, suffix));
  const text = (e) => {
    if (!e) return '';
    const b = readStream(e);
    if (e.name.slice(-4) === '001F') {                       // UTF-16LE
      let s = '';
      for (let i = 0; i + 1 < b.length; i += 2) s += String.fromCharCode(b[i] | (b[i + 1] << 8));
      return s;
    }
    let s = '';                                              // 8-bit
    for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
    return s;
  };
  const subject = text(find('__substg1.0_0037001F')) || text(find('__substg1.0_0037001E'));
  let body = text(find('__substg1.0_1000001F')) || text(find('__substg1.0_1000001E'));
  // the HTML body says where each pasted picture sits (<img src="cid:…">)
  const hEntry = find('__substg1.0_1013001F') || find('__substg1.0_10130102');
  let html = '';
  try { html = hEntry ? text(hEntry) : ''; } catch (e) { html = ''; }
  if (!body && html) body = html.replace(/<[^>]+>/g, ' ');   // fall back to the RTF-less HTML body
  const clean = (s) => s.replace(/\u0000/g, '').replace(/\r\n/g, '\n').replace(/[ \t]+\n/g, '\n').trim();
  // Attachments, including pictures pasted into the body: each is a storage
  // __attach_version1.0_#… holding the bytes (3701 0102), a file name and a type.
  const files = [];
  for (const a of top) {
    if (!a || a.type !== 1 || a.name.indexOf('__attach_version1.0_') !== 0) continue;
    const ch = kids(a), data = findIn(ch, '__substg1.0_37010102');
    if (!data || !data.size) continue;                      // embedded messages and links have no byte stream
    const fname = clean(text(findIn(ch, '__substg1.0_3707001F')) || text(findIn(ch, '__substg1.0_3704001F')) || text(findIn(ch, '__substg1.0_3707001E')) || '');
    const mime = clean(text(findIn(ch, '__substg1.0_370E001F')) || text(findIn(ch, '__substg1.0_370E001E')) || '').toLowerCase();
    const cid = clean(text(findIn(ch, '__substg1.0_3712001F')) || text(findIn(ch, '__substg1.0_3712001E')) || '');
    files.push({ name: fname, mime, cid, size: data.size, bytes: readStream(data) });
  }
  const out = { subject: clean(subject), body: clean(body), html: html.replace(/\u0000/g, ''), files };
  if (!out.subject && !out.body && !files.length) return null;
  return out;
}
if (typeof module !== 'undefined') module.exports = { msgRead };

