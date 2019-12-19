import tornado.web
import json
import base64
import requests

from status.util import SafeHandler
from genologics.config import BASEURI, USERNAME, PASSWORD
from genologics import lims
from genologics.entities import Queue, Artifact, Container
import xml.etree.ElementTree as ET

lims = lims.Lims(BASEURI, USERNAME, PASSWORD)


class qPCRPoolsDataHandler(SafeHandler):
    """ Serves a page with qPCR queues from LIMS listed
    URL: /api/v1/pools_qpcr
    """
    def get(self):
        #qPCR queues
        queues = {}
        queues['MiSeq'] = Queue(lims, id='1002')
        queues['NovaSeq'] = Queue(lims, id='1666')
        queues['LibraryValidation'] = Queue(lims, id='41')

        methods = queues.keys()
        pools = {}

        for method in methods:
            pools[method] ={}
            if queues[method].artifacts:
                tree = ET.fromstring(queues[method].xml())
                for artifact in tree.iter('artifact'):
                    queue_time = artifact.find('queue-time').text
                    container = Container(lims, uri = artifact.find('location').find('container').attrib['uri']).name
                    attr_name = Artifact(lims, uri = artifact.attrib['uri']).name
                    value = artifact.find('location').find('value').text

                    if container in pools[method]:
                        pools[method][container].append({'name': attr_name, 'well': value, 'queue_time': queue_time})
                    else:
                        pools[method][container] = [{'name': attr_name, 'well': value, 'queue_time': queue_time}]

        self.set_header("Content-type", "application/json")
        self.write(json.dumps(pools))


class qPCRPoolsHandler(SafeHandler):
    """ Serves a page with qPCR queues from LIMS listed
    URL: /pools_qpcr
    """
    def get(self):
        t = self.application.loader.load("qpcr_pools.html")
        self.write(t.generate(gs_globals=self.application.gs_globals, user=self.get_current_user()))


class SequencingQueuesDataHandler(SafeHandler):
    """ Serves a page with sequencing queues from LIMS listed
    URL: /api/v1/sequencing_pools
    """
    def get(self):
        #sequencing queues are currently taken as the following
        #Miseq- Step 7: Denature, Dilute and load sample
        #Novaseq Step 11: Load to flow cell
        queues = {}
        queues['MiSeq'] = Queue(lims, id='55')
        queues['NovaSeq'] = Queue(lims, id='1662')

        methods = queues.keys()
        pools = {}

        for method in methods:
            pools[method] ={}
            if queues[method].artifacts:
                tree = ET.fromstring(queues[method].xml())
                for artifact in tree.iter('artifact'):
                    queue_time = artifact.find('queue-time').text
                    container = Container(lims, uri = artifact.find('location').find('container').attrib['uri']).name
                    attr_name = Artifact(lims, uri = artifact.attrib['uri']).name
                    value = artifact.find('location').find('value').text
                    proj_and_samples = {}
                    for sample in Artifact(lims, uri = artifact.attrib['uri']).samples:
                        project = sample.project.id
                        if project in pools[method]:
                            if container in pools[method][project]['plates']:
                                pools[method][project]['plates'][container]['samples'].append(sample.name)
                            else:
                                pools[method][project]['plates'][container] = {
                                                                                'samples': [sample.name],
                                                                                'well': value,
                                                                                'queue_time': queue_time
                                                                                }
                        else:
                             setup = sample.project.udf['Sequencing setup']
                             lanes = sample.project.udf['Sequence units ordered (lanes)']
                             librarytype = sample.project.udf['Library construction method']
                             runmode = sample.project.udf['Sequencing platform']
                             final_loading_conc = 'TBD'
                             if method is 'NovaSeq':
                                 try:
                                     final_loading_conc = list(Container(lims, artifact.find('location').find('container').attrib['uri']).placements.values())[0].udf['Final Loading Concentration (pM)']
                                 except KeyError:
                                     pass
                             pools[method][project] = {
                                                        'name': sample.project.name,
                                                        'setup': setup, 'lanes': lanes,
                                                        'runmode': runmode,
                                                        'final_loading_conc': final_loading_conc,
                                                        'librarytype': librarytype,
                                                        'plates': { container: {'samples': [sample.name],
                                                                    'well': value,
                                                                    'queue_time': queue_time}
                                                                    }
                                                        }
        self.set_header("Content-type", "application/json")
        self.write(json.dumps(pools))


class SequencingQueuesHandler(SafeHandler):
    """ Serves a page with sequencing queues from LIMS listed
    URL: /sequencing_queues
    """
    def get(self):
        t = self.application.loader.load("sequencing_queues.html")
        self.write(t.generate(gs_globals=self.application.gs_globals, user=self.get_current_user()))
